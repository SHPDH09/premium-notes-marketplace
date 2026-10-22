import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { serializeConversation } from "@/lib/crm/serialize";
import { prisma } from "@/lib/db";

/** Lightweight inbox refresh — poll every few seconds until SSE is added. */
export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sinceRaw = req.nextUrl.searchParams.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 60_000);

    const conversations = await prisma.crmConversation.findMany({
      where: {
        companyId: session.companyId,
        updatedAt: { gt: since },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 40,
      include: { contact: { select: { name: true, phone: true } } },
    });

    const unreadTotal = await prisma.crmConversation.aggregate({
      where: { companyId: session.companyId },
      _sum: { unreadCount: true },
    });

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      unreadTotal: unreadTotal._sum.unreadCount ?? 0,
      conversations: conversations.map((c) => serializeConversation(c)),
    });
  });
}
