import { NextRequest, NextResponse } from "next/server";
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

    await prisma.crmConversation.update({
      where: { id: conv.id },
      data: { unreadCount: 0 },
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
