import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const contacts = await prisma.crmContact.findMany({
      where: {
        companyId: session.companyId,
        ...(q
          ? {
              OR: [
                { phone: { contains: q } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { contactTags: { include: { tag: true } } },
    });
    return NextResponse.json({
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        leadStatus: c.leadStatus,
        tags: c.contactTags.map((t) => t.tag),
      })),
    });
  });
}
