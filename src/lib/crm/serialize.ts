import type { CrmConversation } from "@prisma/client";

export function serializeCrmMessage(m: {
  id: string;
  direction: string;
  messageType: string;
  bodyText: string | null;
  mediaUrl: string | null;
  sendMethod: string;
  deliveryStatus: string;
  deliveryError: string | null;
  sentAt: Date;
  sentByMember?: { user?: { name?: string | null } | null } | null;
}) {
  const agentName = m.sentByMember?.user?.name;
  return {
    id: m.id,
    direction: m.direction,
    messageType: m.messageType,
    bodyText: m.bodyText,
    mediaUrl: m.mediaUrl,
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
