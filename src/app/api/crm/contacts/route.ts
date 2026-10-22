import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import {
  buildContactWhere,
  segmentFiltersFromConfig,
  type ContactListFilters,
} from "@/lib/crm/contacts/query";
import { serializeContactListItem } from "@/lib/crm/contacts/serialize";
import { isValidEmail, normalizePhoneInput } from "@/lib/crm/phone";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const contactInclude = {
  contactTags: { include: { tag: true } },
  assignedMember: { include: { user: true } },
  conversations: {
    take: 1,
    orderBy: { lastMessageAt: "desc" as const },
    include: { assignedMember: { include: { user: true } } },
  },
};

function parseListFilters(req: NextRequest, companyId: string): ContactListFilters {
  const sp = req.nextUrl.searchParams;
  return {
    companyId,
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    tagId: sp.get("tagId") ?? undefined,
    assignedMemberId: sp.get("assigned") ?? undefined,
    source: sp.get("source") ?? undefined,
    optedOut: sp.get("optedOut") === "1" ? true : sp.get("optedOut") === "0" ? false : undefined,
    hasOpenConversation: sp.get("openConversations") === "1" ? true : undefined,
    leadStatus: sp.get("leadStatus") ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sp = req.nextUrl.searchParams;
    const segmentId = sp.get("segmentId");

    let filters = parseListFilters(req, session.companyId);
    if (segmentId) {
      if (segmentId.startsWith("builtin:")) {
        const preset = segmentId.replace("builtin:", "");
        filters = {
          ...segmentFiltersFromConfig({ preset }, session.companyId),
          q: filters.q,
        };
      } else {
        const seg = await prisma.crmContactSegment.findFirst({
          where: { id: segmentId, companyId: session.companyId },
        });
        if (seg) {
          filters = {
            ...segmentFiltersFromConfig(seg.filterConfig as Record<string, unknown>, session.companyId),
            q: filters.q,
          };
        }
      }
    }

    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(sp.get("pageSize") ?? 25)));
    const sort = sp.get("sort") ?? "updatedAt";
    const order = sp.get("order") === "asc" ? "asc" : "desc";

    const where = buildContactWhere(filters);
    const orderBy =
      sort === "name"
        ? { name: order as "asc" | "desc" }
        : sort === "createdAt"
          ? { createdAt: order as "asc" | "desc" }
          : sort === "phone"
            ? { phone: order as "asc" | "desc" }
            : { updatedAt: order as "asc" | "desc" };

    const [total, contacts] = await Promise.all([
      prisma.crmContact.count({ where }),
      prisma.crmContact.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: contactInclude,
      }),
    ]);

    return NextResponse.json({
      contacts: contacts.map(serializeContactListItem),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().max(200).optional(),
  source: z.string().max(80).optional(),
  notes: z.string().max(5000).optional(),
  tagIds: z.array(z.string()).optional(),
  assignedMemberId: z.string().optional().nullable(),
  leadStatus: z.string().max(80).optional(),
  marketingConsent: z.boolean().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = createSchema.parse(await req.json());
    const { digits, display, valid } = normalizePhoneInput(body.phone);
    if (!valid) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (body.email && body.email.trim() && !isValidEmail(body.email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const existing = await prisma.crmContact.findUnique({
      where: { companyId_phoneNormalized: { companyId: session.companyId, phoneNormalized: digits } },
      include: { contactTags: { include: { tag: true } } },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "Duplicate phone number",
          duplicate: true,
          existing: serializeContactListItem({
            ...existing,
            conversations: [],
            assignedMember: null,
          }),
        },
        { status: 409 }
      );
    }

    const contact = await prisma.crmContact.create({
      data: {
        companyId: session.companyId,
        phone: display,
        phoneNormalized: digits,
        name: body.name.trim(),
        email: body.email?.trim() || null,
        companyName: body.companyName?.trim() || null,
        source: body.source?.trim() || "manual",
        notes: body.notes?.trim() || null,
        assignedMemberId: body.assignedMemberId ?? null,
        leadStatus: body.leadStatus?.trim() || null,
        marketingConsent: body.marketingConsent ?? false,
        marketingConsentAt: body.marketingConsent ? new Date() : null,
        consentSource: body.marketingConsent ? "manual_form" : null,
        customFields: (body.customFields as Prisma.InputJsonValue | undefined) ?? undefined,
        lastActivityAt: new Date(),
        contactTags: body.tagIds?.length
          ? { create: body.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: contactInclude,
    });

    return NextResponse.json({ contact: serializeContactListItem(contact) }, { status: 201 });
  });
}
