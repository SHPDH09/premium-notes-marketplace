import { NextResponse } from "next/server";
import { assertAgentCanAccessConversation } from "@/lib/crm/agent-inbox-access";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { hydrateConversationMessages } from "@/lib/crm/hydrate-conversation-messages";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const isAdmin =
      session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";
    await assertAgentCanAccessConversation({
      companyId: session.companyId!,
      memberId: session.memberId!,
      isAdmin,
      assignedMemberId: conv.assignedMemberId,
    });

    const result = await hydrateConversationMessages(conv.id);
    return NextResponse.json({ ok: true, ...result });
  });
}
