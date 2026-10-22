import type { CrmSessionUser } from "@/lib/crm/auth";

export function canManageContacts(session: CrmSessionUser): boolean {
  return session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";
}

export function canEditContact(
  session: CrmSessionUser & { memberId: string },
  contact: { assignedMemberId: string | null }
): boolean {
  if (canManageContacts(session)) return true;
  if (!contact.assignedMemberId) return true;
  return contact.assignedMemberId === session.memberId;
}
