import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import { buildContactWhere, segmentFiltersFromConfig } from "@/lib/crm/contacts/query";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const BUILTIN = [
  {
    id: "builtin:new_leads_week",
    name: "New Leads This Week",
    filterConfig: { preset: "new_leads_week" },
  },
  {
    id: "builtin:unassigned",
    name: "Contacts Without an Assigned Agent",
    filterConfig: { preset: "unassigned" },
  },
  {
    id: "builtin:follow_up",
    name: "Contacts Requiring Follow-up",
    filterConfig: { preset: "follow_up" },
  },
  {
    id: "builtin:open_chats",
    name: "Contacts With Open Conversations",
    filterConfig: { hasOpenConversation: true },
  },
  {
    id: "builtin:customers",
    name: "Customers",
    filterConfig: { preset: "customers" },
  },
  {
    id: "builtin:opted_out",
    name: "Opted-out Contacts",
    filterConfig: { preset: "opted_out" },
  },
];

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const saved = await prisma.crmContactSegment.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });

    const segments = [
      ...BUILTIN.map((b) => ({ ...b, builtin: true as const })),
      ...saved.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        filterConfig: s.filterConfig,
        builtin: false as const,
      })),
    ];

    const withCounts = await Promise.all(
      segments.map(async (seg) => {
        const filters = segmentFiltersFromConfig(
          seg.filterConfig as Record<string, unknown>,
          session.companyId
        );
        const count = await prisma.crmContact.count({ where: buildContactWhere(filters) });
        return { ...seg, count };
      })
    );

    return NextResponse.json({ segments: withCounts });
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  filterConfig: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const seg = await prisma.crmContactSegment.create({
      data: {
        companyId: session.companyId,
        name: body.name.trim(),
        description: body.description?.trim(),
        filterConfig: body.filterConfig as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ segment: seg }, { status: 201 });
  });
}
