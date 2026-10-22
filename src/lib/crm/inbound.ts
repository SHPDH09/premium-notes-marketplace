import type { CrmCallRecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveCallLinks } from "@/lib/crm/calls/link-contact";
import { parseWalayerMessagePayload } from "@/lib/crm/walayer-message-parse";
import { formatDisplayPhone, normalizePhoneDigits, phoneFromWaJid } from "@/lib/crm/phone";

type WalayerMessageReceived = {
  message_id?: string;
  wa_message_id?: string;
  chat_jid?: string;
  sender_jid?: string;
  from_me?: boolean;
  type?: string;
  text?: string;
  at?: number;
};

export async function handleWalayerMessageReceived(sessionId: string, data: WalayerMessageReceived) {
  const account = await prisma.crmWhatsAppAccount.findFirst({
    where: { walayerSessionId: sessionId },
  });
  if (!account) return { ok: false as const, reason: "unknown_session" };

  const chatJid = data.chat_jid?.trim();
  if (!chatJid || chatJid.includes("@newsletter") || chatJid.includes("@g.us")) {
    return { ok: false as const, reason: "unsupported_chat_type" };
  }

  if (data.from_me) {
    return { ok: true as const, skipped: "from_me_external" };
  }

  const senderJid = data.sender_jid?.trim() || chatJid;
  const phone = phoneFromWaJid(senderJid) || phoneFromWaJid(chatJid);
  if (!phone) return { ok: false as const, reason: "invalid_jid" };

  const providerMessageId = data.message_id?.trim();
  if (providerMessageId) {
    const dup = await prisma.crmMessage.findUnique({ where: { providerMessageId } });
    if (dup) return { ok: true as const, duplicate: true };
  }

  const digits = normalizePhoneDigits(phone);
  const displayPhone = formatDisplayPhone(digits);
  const parsed = parseWalayerMessagePayload(data as Record<string, unknown>);
  const messageText = parsed.text;
  const textLower = messageText.toLowerCase();
  const isOptOut = ["stop", "unsubscribe", "opt out", "opt-out"].includes(textLower);

  const contact = await prisma.crmContact.upsert({
    where: { companyId_phoneNormalized: { companyId: account.companyId, phoneNormalized: digits } },
    create: {
      companyId: account.companyId,
      phone: displayPhone,
      phoneNormalized: digits,
      waJid: senderJid,
      source: "whatsapp",
      lastActivityAt: new Date(),
      ...(isOptOut
        ? { status: "DO_NOT_CONTACT", optedOutAt: new Date(), marketingConsent: false }
        : {}),
    },
    update: {
      waJid: senderJid,
      lastActivityAt: new Date(),
      ...(isOptOut
        ? { status: "DO_NOT_CONTACT", optedOutAt: new Date(), marketingConsent: false }
        : {}),
    },
  });

  if (isOptOut) {
    await prisma.crmSuppressionEntry.upsert({
      where: {
        companyId_phoneNormalized: { companyId: account.companyId, phoneNormalized: digits },
      },
      create: {
        companyId: account.companyId,
        phoneNormalized: digits,
        reason: "keyword_stop",
      },
      update: { reason: "keyword_stop" },
    });
  }

  const preview =
    messageText.slice(0, 280) || (parsed.mediaUrl ? `[${parsed.type}]` : `[${parsed.type}]`);
  const sentAt = data.at ? new Date(data.at * 1000) : new Date();

  const conversation = await prisma.crmConversation.upsert({
    where: {
      whatsappAccountId_chatJid: { whatsappAccountId: account.id, chatJid },
    },
    create: {
      companyId: account.companyId,
      contactId: contact.id,
      whatsappAccountId: account.id,
      chatJid,
      status: "OPEN",
      unreadCount: 1,
      lastMessageAt: sentAt,
      lastMessagePreview: preview,
    },
    update: {
      unreadCount: { increment: 1 },
      lastMessageAt: sentAt,
      lastMessagePreview: preview,
      status: "OPEN",
    },
  });

  await prisma.crmMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      messageType: parsed.type,
      bodyText: messageText,
      mediaUrl: parsed.mediaUrl ?? undefined,
      providerMessageId: parsed.providerMessageId ?? providerMessageId ?? undefined,
      waMessageId: parsed.waMessageId ?? undefined,
      sendMethod: "EXTERNAL",
      deliveryStatus: "DELIVERED",
      sentAt,
    },
  });

  return { ok: true as const, conversationId: conversation.id };
}

function mapWalayerCallStatus(event: string, data: Record<string, unknown>): CrmCallRecordStatus | null {
  const raw = typeof data.status === "string" ? data.status.toUpperCase() : "";
  if (event === "call.received") return "RINGING";
  if (event === "call.answered") return "ANSWERED";
  if (event === "call.missed") return "MISSED";
  if (event === "call.rejected") return "REJECTED";
  if (event === "call.failed") return "FAILED";
  if (event === "call.ended") {
    if (raw === "ANSWERED" || raw === "COMPLETED") return "ANSWERED";
    if (raw === "MISSED") return "MISSED";
    if (raw === "REJECTED") return "REJECTED";
    if (raw === "FAILED") return "FAILED";
    return null;
  }
  return null;
}

export async function handleWalayerCallEvent(
  sessionId: string,
  event: string,
  data: Record<string, unknown>
) {
  const account = await prisma.crmWhatsAppAccount.findFirst({
    where: { walayerSessionId: sessionId },
  });
  if (!account) return;

  const providerCallId = String(data.call_id ?? "").trim();
  if (!providerCallId) return;

  const callerJid = typeof data.caller_jid === "string" ? data.caller_jid : null;
  const chatJid = typeof data.chat_jid === "string" ? data.chat_jid : null;
  const links = await resolveCallLinks({
    companyId: account.companyId,
    callerJid,
    chatJid,
  });

  const durationSec =
    typeof data.duration_sec === "number"
      ? data.duration_sec
      : typeof data.duration === "number"
        ? data.duration
        : undefined;

  const endedAt =
    event === "call.ended" || event === "call.missed" || event === "call.rejected" || event === "call.failed"
      ? new Date()
      : undefined;

  const status = mapWalayerCallStatus(event, data);

  if (event === "call.received") {
    await prisma.crmCallRecord.upsert({
      where: {
        companyId_providerCallId: {
          companyId: account.companyId,
          providerCallId,
        },
      },
      create: {
        companyId: account.companyId,
        providerCallId,
        direction: "INBOUND",
        status: "RINGING",
        callerJid,
        chatJid,
        contactId: links.contactId,
        conversationId: links.conversationId,
        assignedMemberId: links.assignedMemberId,
      },
      update: {
        status: "RINGING",
        contactId: links.contactId ?? undefined,
        conversationId: links.conversationId ?? undefined,
      },
    });
    return;
  }

  const existing = await prisma.crmCallRecord.findUnique({
    where: {
      companyId_providerCallId: {
        companyId: account.companyId,
        providerCallId,
      },
    },
  });

  if (!existing) {
    if (!status) return;
    await prisma.crmCallRecord.create({
      data: {
        companyId: account.companyId,
        providerCallId,
        direction: "INBOUND",
        status,
        callerJid,
        chatJid,
        contactId: links.contactId,
        conversationId: links.conversationId,
        assignedMemberId: links.assignedMemberId,
        durationSec,
        endedAt,
      },
    });
    return;
  }

  await prisma.crmCallRecord.update({
    where: { id: existing.id },
    data: {
      ...(status ? { status } : {}),
      ...(durationSec != null ? { durationSec } : {}),
      ...(endedAt ? { endedAt } : {}),
      contactId: existing.contactId ?? links.contactId ?? undefined,
      conversationId: existing.conversationId ?? links.conversationId ?? undefined,
      assignedMemberId: existing.assignedMemberId ?? links.assignedMemberId ?? undefined,
    },
  });
}

/** @deprecated use handleWalayerCallEvent */
export async function handleWalayerCallReceived(sessionId: string, data: Record<string, unknown>) {
  await handleWalayerCallEvent(sessionId, "call.received", data);
}

export async function handleWalayerSessionLifecycle(sessionId: string, event: string) {
  const account = await prisma.crmWhatsAppAccount.findFirst({
    where: { walayerSessionId: sessionId },
  });
  if (!account) return;

  if (event === "session.paired" || event === "session.connected") {
    await prisma.crmWhatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: "CONNECTED",
        statusMessage: null,
        lastConnectedAt: new Date(),
      },
    });
    return;
  }
  if (event === "session.disconnected") {
    await prisma.crmWhatsAppAccount.update({
      where: { id: account.id },
      data: { status: "CONNECTING", statusMessage: "Reconnecting…" },
    });
    return;
  }
  if (event === "session.logged_out") {
    await prisma.crmWhatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: "DISCONNECTED",
        statusMessage: "Logged out on phone — scan QR to reconnect",
      },
    });
  }
}
