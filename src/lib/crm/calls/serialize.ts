import type { CrmCallRecord, CrmCompanyMember, CrmContact, User } from "@prisma/client";
import { phoneFromWaJid } from "@/lib/crm/phone";

type Row = CrmCallRecord & {
  contact: Pick<CrmContact, "id" | "name" | "phone"> | null;
  assignedMember: (CrmCompanyMember & { user: Pick<User, "name"> }) | null;
  conversation: { id: string } | null;
};

export function serializeCallRow(c: Row, opts?: { includeRecording?: boolean }) {
  const callerPhone =
    c.contact?.phone ??
    (c.callerJid ? phoneFromWaJid(c.callerJid) : null) ??
    (c.chatJid ? phoneFromWaJid(c.chatJid) : null);

  return {
    id: c.id,
    direction: c.direction,
    status: c.status,
    callerJid: c.callerJid,
    chatJid: c.chatJid,
    startedAt: c.startedAt.toISOString(),
    endedAt: c.endedAt?.toISOString() ?? null,
    durationSec: c.durationSec,
    providerCallId: c.providerCallId,
    outcome: c.outcome,
    internalNotes: c.internalNotes,
    hasRecording: !!c.recordingRef,
    recordingAvailable: opts?.includeRecording ? !!c.recordingRef : undefined,
    callerPhone,
    contact: c.contact
      ? { id: c.contact.id, name: c.contact.name, phone: c.contact.phone }
      : null,
    agent: c.assignedMember
      ? { id: c.assignedMember.id, name: c.assignedMember.user.name }
      : null,
    conversationId: c.conversation?.id ?? c.conversationId ?? null,
  };
}
