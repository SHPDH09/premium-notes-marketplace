import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  handleWalayerCallEvent,
  handleWalayerMessageReceived,
  handleWalayerSessionLifecycle,
} from "@/lib/crm/inbound";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { verifyWalayerWebhookSignature } from "@/lib/crm/webhook-verify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const creds = await getWalayerPlatformCredentials();
  const secret = creds?.webhookSecret ?? process.env.WALAYER_WEBHOOK_SECRET?.trim();
  if (secret) {
    const ok = verifyWalayerWebhookSignature({
      rawBody,
      signatureHeader: req.headers.get("x-signature"),
      timestampHeader: req.headers.get("x-timestamp"),
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let envelope: {
    id?: string;
    event?: string;
    session_id?: string;
    data?: Record<string, unknown>;
  };
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = envelope.id?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const existing = await prisma.crmWebhookEvent.findUnique({ where: { eventId } });
  if (existing?.processed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const row =
    existing ??
    (await prisma.crmWebhookEvent.create({
      data: {
        eventId,
        eventType: envelope.event ?? "unknown",
        sessionId: envelope.session_id ?? null,
        payload: envelope as object,
      },
    }));

  const event = envelope.event ?? "";
  const sessionId = envelope.session_id ?? "";
  const data = envelope.data ?? {};

  try {
    if (event === "message.received" && sessionId) {
      await handleWalayerMessageReceived(sessionId, data as Record<string, unknown>);
    } else if (event.startsWith("call.") && sessionId) {
      await handleWalayerCallEvent(sessionId, event, data);
    } else if (event.startsWith("session.") && sessionId) {
      await handleWalayerSessionLifecycle(sessionId, event);
    }

    await prisma.crmWebhookEvent.update({
      where: { id: row.id },
      data: { processed: true, processedAt: new Date(), error: null },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "process_failed";
    await prisma.crmWebhookEvent.update({
      where: { id: row.id },
      data: { error: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
