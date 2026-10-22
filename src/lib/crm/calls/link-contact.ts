import { prisma } from "@/lib/db";
import { normalizePhoneDigits, phoneFromWaJid } from "@/lib/crm/phone";

export async function resolveCallLinks(params: {
  companyId: string;
  callerJid?: string | null;
  chatJid?: string | null;
}) {
  const jid = params.chatJid ?? params.callerJid;
  const phoneFromJid = jid ? phoneFromWaJid(jid) : null;
  const digits = phoneFromJid ? normalizePhoneDigits(phoneFromJid) : null;

  let contactId: string | null = null;
  let conversationId: string | null = null;
  let assignedMemberId: string | null = null;

  if (digits) {
    const contact = await prisma.crmContact.findUnique({
      where: { companyId_phoneNormalized: { companyId: params.companyId, phoneNormalized: digits } },
      select: { id: true, assignedMemberId: true },
    });
    if (contact) {
      contactId = contact.id;
      assignedMemberId = contact.assignedMemberId;
      const conv = await prisma.crmConversation.findFirst({
        where: { companyId: params.companyId, contactId: contact.id },
        orderBy: { lastMessageAt: "desc" },
        select: { id: true, assignedMemberId: true },
      });
      if (conv) {
        conversationId = conv.id;
        if (conv.assignedMemberId) assignedMemberId = conv.assignedMemberId;
      }
    }
  }

  return { contactId, conversationId, assignedMemberId, phoneDigits: digits };
}
