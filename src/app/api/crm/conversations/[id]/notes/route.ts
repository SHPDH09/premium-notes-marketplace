import { NextRequest, NextResponse } from "next/server";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const notes = await prisma.crmInternalNote.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      include: { member: { include: { user: { select: { name: true } } } } },
    });
    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        author: n.member.user.name,
      })),
    });
  });
}

const postSchema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }

    const note = await prisma.crmInternalNote.create({
      data: {
        conversationId: conv.id,
        memberId: session.memberId!,
        body: parsed.data.body,
      },
    });
    return NextResponse.json({ id: note.id });
  });
}
