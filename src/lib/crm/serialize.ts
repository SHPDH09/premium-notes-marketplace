import type { CrmConversation } from "@prisma/client";
import { extractWalayerTextDeep, messageDisplayFallback } from "@/lib/crm/walayer-message-parse";

export function resolveCrmMediaUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
  if (stored.startsWith("walayer:")) {
    const id = stored.slice("walayer:".length);
    return id ? `/api/crm/media/walayer/${encodeURIComponent(id)}` : null;
  }
  return stored;
}

export function serializeCrmMessage(m: {
  id: string;
  direction: string;
  messageType: string;
  bodyText: string | null;
  mediaUrl: string | null;
  providerPayload?: unknown;
  sendMethod: string;
  deliveryStatus: string;
  deliveryError: string | null;
  sentAt: Date;
  sentByMember?: { user?: { name?: string | null } | null } | null;
}) {
  const agentName = m.sentByMember?.user?.name;
  const resolvedBody =
    (m.bodyText ?? "").trim() ||
    (m.providerPayload ? extractWalayerTextDeep(m.providerPayload) : "") ||
    null;
  return {
    id: m.id,
    direction: m.direction,
    messageType: m.messageType,
    bodyText: resolvedBody,
    displayText: messageDisplayFallback(m.messageType, resolvedBody),
    mediaUrl: m.mediaUrl,
    mediaDisplayUrl: resolveCrmMediaUrl(m.mediaUrl),
    sendMethod: m.sendMethod,
    deliveryStatus: m.deliveryStatus,
    deliveryError: m.deliveryError,
    sentAt: m.sentAt.toISOString(),
    repliedByLabel:
      m.direction === "OUTBOUND" && m.sendMethod === "MANUAL" && agentName
        ? `Replied by: ${agentName}`
        : m.direction === "OUTBOUND" && m.sendMethod === "AUTOMATION"
          ? "Automated reply"
          : m.direction === "OUTBOUND" && m.sendMethod === "EXTERNAL"
            ? "Sent outside CRM"
            : null,
  };
}

export function serializeConversation(c: CrmConversation & { contact?: { name: string | null; phone: string } }) {
  return {
    id: c.id,
    status: c.status,
    priority: c.priority,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: c.lastMessagePreview,
    assignedMemberId: c.assignedMemberId,
    contact: c.contact
      ? { name: c.contact.name, phone: c.contact.phone }
      : undefined,
  };
}
