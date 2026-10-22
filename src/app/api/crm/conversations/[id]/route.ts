import { NextRequest, NextResponse } from "next/server";
import { assertAgentCanAccessConversation } from "@/lib/crm/agent-inbox-access";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { serializeConversation } from "@/lib/crm/serialize";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({
      where: { id: ctx.params.id },
      include: {
        contact: true,
        assignedMember: { include: { user: { select: { name: true, email: true } } } },
        conversationTags: { include: { tag: true } },
      },
    });
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

    await prisma.crmConversation.update({
      where: { id: conv.id },
      data: { unreadCount: 0 },
    });

    const assignments = await prisma.crmConversationAssignment.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        fromMember: { include: { user: { select: { name: true } } } },
        toMember: { include: { user: { select: { name: true } } } },
        assignedBy: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      conversation: {
        ...serializeConversation(conv),
        chatJid: conv.chatJid,
        contact: conv.contact,
        assignee: conv.assignedMember
          ? { id: conv.assignedMember.id, name: conv.assignedMember.user.name }
          : null,
        tags: conv.conversationTags.map((t) => t.tag),
        assignmentHistory: assignments.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          note: a.note,
          from: a.fromMember?.user.name ?? null,
          to: a.toMember?.user.name ?? null,
          by: a.assignedBy?.user.name ?? null,
        })),
      },
    });
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const updated = await prisma.crmConversation.update({
      where: { id: conv.id },
      data: parsed.data,
      include: { contact: { select: { name: true, phone: true } } },
    });
    return NextResponse.json({ conversation: serializeConversation(updated) });
  });
}
