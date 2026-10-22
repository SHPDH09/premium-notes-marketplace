import { NextRequest, NextResponse } from "next/server";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  toMemberId: z.string().cuid().nullable(),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (parsed.data.toMemberId) {
      const target = await prisma.crmCompanyMember.findFirst({
        where: { id: parsed.data.toMemberId, companyId: session.companyId, isActive: true },
      });
      if (!target) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const fromId = conv.assignedMemberId;
    const updated = await prisma.crmConversation.update({
      where: { id: conv.id },
      data: { assignedMemberId: parsed.data.toMemberId },
    });

    await prisma.crmConversationAssignment.create({
      data: {
        conversationId: conv.id,
        fromMemberId: fromId,
        toMemberId: parsed.data.toMemberId,
        assignedById: session.memberId,
        note: parsed.data.note,
      },
    });

    if (parsed.data.toMemberId) {
      await prisma.crmNotification.create({
        data: {
          memberId: parsed.data.toMemberId,
          type: "assignment",
          title: "Chat assigned to you",
          body: parsed.data.note ?? "A conversation was assigned to you.",
          payload: { conversationId: conv.id },
        },
      });
    }

    return NextResponse.json({ conversationId: updated.id, assignedMemberId: updated.assignedMemberId });
  });
}
