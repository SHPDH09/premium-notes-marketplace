import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const members = await prisma.crmCompanyMember.findMany({
      where: { companyId: session.companyId, isActive: true },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        memberRole: m.memberRole,
      })),
    });
  });
}
