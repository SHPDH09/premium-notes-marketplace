import { prisma } from "@/lib/db";

export async function getCompanyInboxPolicy(companyId: string) {
  const company = await prisma.crmCompany.findUnique({
    where: { id: companyId },
    select: { agentsCanViewUnassignedChats: true },
  });
  return {
    agentsCanViewUnassignedChats: company?.agentsCanViewUnassignedChats ?? false,
  };
}

/** Non-admin agents: only assigned chats unless company allows unassigned pool. */
export function agentConversationFilter(params: {
  memberId: string;
  isAdmin: boolean;
  agentsCanViewUnassignedChats: boolean;
  assignedFilter?: string | null;
}) {
  if (params.isAdmin) return undefined;
  if (params.assignedFilter === "me") {
    return { assignedMemberId: params.memberId };
  }
  if (params.agentsCanViewUnassignedChats) {
    return {
      OR: [{ assignedMemberId: null }, { assignedMemberId: params.memberId }],
    };
  }
  return { assignedMemberId: params.memberId };
}

export async function assertAgentCanAccessConversation(params: {
  companyId: string;
  memberId: string;
  isAdmin: boolean;
  assignedMemberId: string | null;
}) {
  if (params.isAdmin) return;
  const policy = await getCompanyInboxPolicy(params.companyId);
  if (params.assignedMemberId === params.memberId) return;
  if (!params.assignedMemberId && policy.agentsCanViewUnassignedChats) return;
  throw new Error("FORBIDDEN");
}
