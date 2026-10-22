import { NextRequest, NextResponse } from "next/server";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { hydrateConversationMessages } from "@/lib/crm/hydrate-conversation-messages";
import { serializeCrmMessage } from "@/lib/crm/serialize";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import {
  walayerSendTextMessage,
  walayerSendTypedMessage,
  walayerUploadMediaBase64,
} from "@/lib/walayer/client";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "node:crypto";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    await hydrateConversationMessages(conv.id).catch(() => undefined);

    const messages = await prisma.crmMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { sentAt: "asc" },
      take: 200,
      include: { sentByMember: { include: { user: { select: { name: true } } } } },
    });

    return NextResponse.json({ messages: messages.map(serializeCrmMessage) });
  });
}

const postSchema = z.object({
  text: z.string().min(1).max(4096),
});

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({
      where: { id: ctx.params.id },
      include: { whatsappAccount: true },
    });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let text = "";
    let uploadFile: File | null = null;

    if (isMultipart) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file attachment" }, { status: 400 });
      }
      if (file.size > MAX_MEDIA_BYTES) {
        return NextResponse.json({ error: "File exceeds 16 MB limit" }, { status: 400 });
      }
      uploadFile = file;
      text = String(form.get("caption") ?? form.get("text") ?? "").trim();
    } else {
      const parsed = postSchema.safeParse(await req.json());
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid message" }, { status: 400 });
      }
      text = parsed.data.text;
    }

    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return NextResponse.json({ error: "WhatsApp provider not configured by platform admin" }, { status: 503 });
    }
    const sessionId = conv.whatsappAccount.walayerSessionId;
    if (!sessionId || conv.whatsappAccount.status !== "CONNECTED") {
      return NextResponse.json({ error: "WhatsApp number not connected" }, { status: 400 });
    }

    const idempotencyKey = `crm-${conv.id}-${randomUUID()}`;

    if (uploadFile) {
      const mimeType = uploadFile.type || "application/octet-stream";
      const base64 = Buffer.from(await uploadFile.arrayBuffer()).toString("base64");
      const upload = await walayerUploadMediaBase64({
        apiKey: creds.apiKey,
        apiBaseUrl: creds.apiBaseUrl,
        base64,
        mimeType,
        filename: uploadFile.name,
      });
      if (!upload.ok) {
        return NextResponse.json({ error: upload.error }, { status: 400 });
      }

      const mediaId = upload.data.id;
      const isImage = mimeType.startsWith("image/");
      const messageType = isImage ? "image" : "document";
      const preview = text || uploadFile.name || `[${messageType}]`;

      const pending = await prisma.crmMessage.create({
        data: {
          conversationId: conv.id,
          direction: "OUTBOUND",
          messageType,
          bodyText: text || uploadFile.name,
          mediaUrl: `walayer:${mediaId}`,
          sendMethod: "MANUAL",
          sentByMemberId: session.memberId,
          deliveryStatus: "QUEUED",
          idempotencyKey,
        },
        include: { sentByMember: { include: { user: { select: { name: true } } } } },
      });

      const sendBody = isImage
        ? { id: mediaId, caption: text || undefined }
        : { id: mediaId, filename: uploadFile.name, caption: text || undefined };

      const send = await walayerSendTypedMessage({
        apiKey: creds.apiKey,
        apiBaseUrl: creds.apiBaseUrl,
        sessionId,
        to: conv.chatJid,
        type: messageType,
        body: sendBody,
        idempotencyKey,
      });

      if (!send.ok) {
        const failed = await prisma.crmMessage.update({
          where: { id: pending.id },
          data: { deliveryStatus: "FAILED", deliveryError: send.error },
          include: { sentByMember: { include: { user: { select: { name: true } } } } },
        });
        return NextResponse.json(
          { error: send.error, message: serializeCrmMessage(failed) },
          { status: 400 }
        );
      }

      const providerMessageId =
        typeof send.data === "object" && send.data && "id" in send.data
          ? String((send.data as { id: string }).id)
          : undefined;

      const saved = await prisma.crmMessage.update({
        where: { id: pending.id },
        data: { deliveryStatus: "SENT", providerMessageId },
        include: { sentByMember: { include: { user: { select: { name: true } } } } },
      });

      await prisma.crmConversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: preview.slice(0, 280) },
      });

      return NextResponse.json({ message: serializeCrmMessage(saved) });
    }

    const pending = await prisma.crmMessage.create({
      data: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        bodyText: text,
        sendMethod: "MANUAL",
        sentByMemberId: session.memberId,
        deliveryStatus: "QUEUED",
        idempotencyKey,
      },
      include: { sentByMember: { include: { user: { select: { name: true } } } } },
    });

    const send = await walayerSendTextMessage({
      apiKey: creds.apiKey,
      apiBaseUrl: creds.apiBaseUrl,
      sessionId,
      to: conv.chatJid,
      text,
      idempotencyKey,
    });

    if (!send.ok) {
      const failed = await prisma.crmMessage.update({
        where: { id: pending.id },
        data: { deliveryStatus: "FAILED", deliveryError: send.error },
        include: { sentByMember: { include: { user: { select: { name: true } } } } },
      });
      return NextResponse.json(
        { error: send.error, message: serializeCrmMessage(failed) },
        { status: 400 }
      );
    }

    const providerMessageId =
      typeof send.data === "object" && send.data && "id" in send.data
        ? String((send.data as { id: string }).id)
        : undefined;

    const saved = await prisma.crmMessage.update({
      where: { id: pending.id },
      data: {
        deliveryStatus: "SENT",
        providerMessageId,
      },
      include: { sentByMember: { include: { user: { select: { name: true } } } } },
    });

    await prisma.crmConversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: text.slice(0, 280),
      },
    });

    return NextResponse.json({ message: serializeCrmMessage(saved) });
  });
}

/** Retry a failed outbound message with a new idempotency key. */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const body = (await req.json()) as { messageId?: string; action?: string };
    if (body.action !== "retry" || !body.messageId) {
      return NextResponse.json({ error: "Invalid retry request" }, { status: 400 });
    }

    const conv = await prisma.crmConversation.findUnique({
      where: { id: ctx.params.id },
      include: { whatsappAccount: true },
    });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const msg = await prisma.crmMessage.findFirst({
      where: { id: body.messageId, conversationId: conv.id, direction: "OUTBOUND" },
    });
    if (!msg || msg.deliveryStatus !== "FAILED") {
      return NextResponse.json({ error: "Message not eligible for retry" }, { status: 400 });
    }
    if (!msg.bodyText?.trim()) {
      return NextResponse.json({ error: "Cannot retry empty message" }, { status: 400 });
    }

    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return NextResponse.json({ error: "WhatsApp provider not configured" }, { status: 503 });
    }
    const sessionId = conv.whatsappAccount.walayerSessionId;
    if (!sessionId || conv.whatsappAccount.status !== "CONNECTED") {
      return NextResponse.json({ error: "WhatsApp number not connected" }, { status: 400 });
    }

    const idempotencyKey = `crm-retry-${msg.id}-${randomUUID()}`;
    const send = await walayerSendTextMessage({
      apiKey: creds.apiKey,
      apiBaseUrl: creds.apiBaseUrl,
      sessionId,
      to: conv.chatJid,
      text: msg.bodyText,
      idempotencyKey,
    });

    if (!send.ok) {
      const failed = await prisma.crmMessage.update({
        where: { id: msg.id },
        data: { deliveryError: send.error },
        include: { sentByMember: { include: { user: { select: { name: true } } } } },
      });
      return NextResponse.json({ error: send.error, message: serializeCrmMessage(failed) }, { status: 400 });
    }

    const providerMessageId =
      typeof send.data === "object" && send.data && "id" in send.data
        ? String((send.data as { id: string }).id)
        : undefined;

    const saved = await prisma.crmMessage.update({
      where: { id: msg.id },
      data: {
        deliveryStatus: "SENT",
        deliveryError: null,
        providerMessageId,
        idempotencyKey,
        sentByMemberId: session.memberId,
      },
      include: { sentByMember: { include: { user: { select: { name: true } } } } },
    });

    return NextResponse.json({ message: serializeCrmMessage(saved) });
  });
}
