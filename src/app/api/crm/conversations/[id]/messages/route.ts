import { NextRequest, NextResponse } from "next/server";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { serializeCrmMessage } from "@/lib/crm/serialize";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerSendTextMessage } from "@/lib/walayer/client";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "node:crypto";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

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

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({
      where: { id: ctx.params.id },
      include: { whatsappAccount: true },
    });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
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
    const pending = await prisma.crmMessage.create({
      data: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        bodyText: parsed.data.text,
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
      text: parsed.data.text,
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
        lastMessagePreview: parsed.data.text.slice(0, 280),
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
