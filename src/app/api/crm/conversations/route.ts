import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { serializeConversation } from "@/lib/crm/serialize";
import { prisma } from "@/lib/db";
import type { CrmConversationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") as CrmConversationStatus | null;
    const assigned = sp.get("assigned");
    const q = sp.get("q")?.trim();
    const memberId = session.memberId!;

    const where = {
      companyId: session.companyId!,
    } as {
      companyId: string;
      status?: CrmConversationStatus;
      assignedMemberId?: string | null;
      OR?: object[];
    };
    if (status) where.status = status;
    if (assigned === "me") where.assignedMemberId = memberId;
    if (assigned === "unassigned") where.assignedMemberId = null;
    if (q) {
      where.OR = [
        { contact: { phone: { contains: q } } },
        { contact: { name: { contains: q, mode: "insensitive" } } },
        { lastMessagePreview: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.crmConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 80,
      include: { contact: { select: { name: true, phone: true } } },
    });

    return NextResponse.json({
      conversations: rows.map((c) => serializeConversation(c)),
    });
  });
}
