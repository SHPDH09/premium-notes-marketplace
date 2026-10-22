import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertConversationCompany, requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

const schema = z.object({ tagIds: z.array(z.string()) });

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const conv = await prisma.crmConversation.findUnique({ where: { id: ctx.params.id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertConversationCompany(conv.companyId, session.companyId!);

    const { tagIds } = schema.parse(await req.json());
    const tags = await prisma.crmTag.findMany({
      where: { companyId: session.companyId, id: { in: tagIds } },
    });
    if (tags.length !== tagIds.length) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.crmConversationTag.deleteMany({ where: { conversationId: conv.id } });
      if (tagIds.length) {
        await tx.crmConversationTag.createMany({
          data: tagIds.map((tagId) => ({ conversationId: conv.id, tagId })),
        });
      }
    });

    const updated = await prisma.crmConversation.findUnique({
      where: { id: conv.id },
      include: { conversationTags: { include: { tag: true } } },
    });

    return NextResponse.json({
      tags: updated?.conversationTags.map((t) => t.tag) ?? [],
    });
  });
}
