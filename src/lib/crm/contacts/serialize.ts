import type { Prisma } from "@prisma/client";

export type ContactWithRelations = Prisma.CrmContactGetPayload<{
  include: {
    contactTags: { include: { tag: true } };
    assignedMember: { include: { user: true } };
    conversations: {
      take: 1;
      orderBy: { lastMessageAt: "desc" };
      include: { assignedMember: { include: { user: true } } };
    };
  };
}>;

export function serializeContactListItem(c: ContactWithRelations) {
  const latest = c.conversations[0];
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    companyName: c.companyName,
    source: c.source,
    status: c.status,
    leadStatus: c.leadStatus,
    tags: c.contactTags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
    assignedAgent: c.assignedMember
      ? { id: c.assignedMember.id, name: c.assignedMember.user.name }
      : latest?.assignedMember
        ? { id: latest.assignedMember.id, name: latest.assignedMember.user.name }
        : null,
    lastConversationAt: latest?.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: latest?.lastMessagePreview ?? null,
    conversationId: latest?.id ?? null,
    marketingConsent: c.marketingConsent,
    optedOut: !!c.optedOutAt || c.status === "DO_NOT_CONTACT",
    createdAt: c.createdAt.toISOString(),
    lastActivityAt: (c.lastActivityAt ?? c.updatedAt).toISOString(),
  };
}
