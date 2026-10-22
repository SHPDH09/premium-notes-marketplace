import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import { buildContactWhere, segmentFiltersFromConfig } from "@/lib/crm/contacts/query";
import { prisma } from "@/lib/db";

function csvEscape(v: string) {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sp = req.nextUrl.searchParams;
    const ids = sp.get("ids")?.split(",").filter(Boolean);

    let where = buildContactWhere({
      companyId: session.companyId,
      q: sp.get("q") ?? undefined,
      tagId: sp.get("tagId") ?? undefined,
    });

    if (ids?.length) {
      where = { AND: [where, { id: { in: ids } }] };
    }

    const segmentId = sp.get("segmentId");
    if (segmentId?.startsWith("builtin:")) {
      where = buildContactWhere({
        ...segmentFiltersFromConfig({ preset: segmentId.replace("builtin:", "") }, session.companyId),
        q: sp.get("q") ?? undefined,
      });
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      take: 10000,
      include: { contactTags: { include: { tag: true } }, assignedMember: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const header = [
      "name",
      "phone",
      "email",
      "company",
      "source",
      "status",
      "tags",
      "assigned_agent",
      "marketing_consent",
      "opted_out",
      "created_at",
    ];
    const rows = contacts.map((c) =>
      [
        c.name ?? "",
        c.phone,
        c.email ?? "",
        c.companyName ?? "",
        c.source ?? "",
        c.status,
        c.contactTags.map((t) => t.tag.name).join("; "),
        c.assignedMember?.user.name ?? "",
        c.marketingConsent ? "yes" : "no",
        c.optedOutAt ? "yes" : "no",
        c.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts-export.csv"`,
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return GET(req);
  });
}
