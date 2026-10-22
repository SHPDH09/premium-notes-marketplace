import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { serializeConversation } from "@/lib/crm/serialize";
import { prisma } from "@/lib/db";
import type { CrmConversationStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") as CrmConversationStatus | null;
    const assigned = sp.get("assigned");
    const q = sp.get("q")?.trim();
    const unreadOnly = sp.get("unread") === "1";
    const priority = sp.get("priority");
    const agentId = sp.get("agentId");
    const sort = sp.get("sort") ?? "latest";
    const memberId = session.memberId!;
    const isAdmin =
      session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";

    const and: Prisma.CrmConversationWhereInput[] = [{ companyId: session.companyId! }];

    if (status) and.push({ status });
    if (assigned === "me") and.push({ assignedMemberId: memberId });
    if (assigned === "unassigned") and.push({ assignedMemberId: null });
    if (agentId) and.push({ assignedMemberId: agentId });
    if (unreadOnly) and.push({ unreadCount: { gt: 0 } });
    if (priority === "HIGH" || priority === "URGENT") and.push({ priority });

    if (!isAdmin && assigned !== "me") {
      and.push({
        OR: [{ assignedMemberId: null }, { assignedMemberId: memberId }],
      });
    }

    if (q) {
      and.push({
        OR: [
          { contact: { phone: { contains: q } } },
          { contact: { name: { contains: q, mode: "insensitive" } } },
          { lastMessagePreview: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const orderBy: Prisma.CrmConversationOrderByWithRelationInput[] =
      sort === "priority"
        ? [{ priority: "desc" }, { lastMessageAt: "desc" }]
        : sort === "oldest_unanswered"
          ? [{ lastMessageAt: "asc" }]
          : [{ lastMessageAt: "desc" }];

    const rows = await prisma.crmConversation.findMany({
      where: { AND: and },
      orderBy,
      take: 100,
      include: {
        contact: { select: { name: true, phone: true, id: true } },
        assignedMember: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      conversations: rows.map((c) => ({
        ...serializeConversation(c),
        assigneeName: c.assignedMember?.user.name ?? null,
      })),
    });
  });
}
