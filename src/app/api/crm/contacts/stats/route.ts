import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { monthStart } from "@/lib/crm/contacts/query";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const companyId = session.companyId;
    const month = monthStart();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      addedThisMonth,
      active,
      withOpenConversations,
      unassigned,
      newThisWeek,
    ] = await Promise.all([
      prisma.crmContact.count({ where: { companyId, status: { not: "ARCHIVED" } } }),
      prisma.crmContact.count({ where: { companyId, createdAt: { gte: month } } }),
      prisma.crmContact.count({
        where: { companyId, status: "ACTIVE", lastActivityAt: { gte: weekAgo } },
      }),
      prisma.crmContact.count({
        where: {
          companyId,
          conversations: { some: { status: { in: ["OPEN", "PENDING"] } } },
        },
      }),
      prisma.crmContact.count({
        where: { companyId, assignedMemberId: null, status: { not: "ARCHIVED" } },
      }),
      prisma.crmContact.count({ where: { companyId, createdAt: { gte: weekAgo } } }),
    ]);

    return NextResponse.json({
      stats: {
        total,
        newContacts: newThisWeek,
        active,
        withOpenConversations,
        unassigned,
        addedThisMonth,
      },
    });
  });
}
