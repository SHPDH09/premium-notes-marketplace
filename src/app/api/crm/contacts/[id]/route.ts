import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canEditContact, canManageContacts } from "@/lib/crm/contacts/permissions";
import { serializeContactListItem } from "@/lib/crm/contacts/serialize";
import { serializeCallRow } from "@/lib/crm/calls/serialize";
import { isValidEmail, normalizePhoneInput } from "@/lib/crm/phone";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  companyName: z.string().max(200).optional().nullable(),
  source: z.string().max(80).optional(),
  notes: z.string().max(5000).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  assignedMemberId: z.string().optional().nullable(),
  leadStatus: z.string().max(80).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DO_NOT_CONTACT"]).optional(),
  marketingConsent: z.boolean().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const contact = await prisma.crmContact.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
      include: {
        contactTags: { include: { tag: true } },
        assignedMember: { include: { user: true } },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 20,
          include: {
            assignedMember: { include: { user: true } },
            messages: { orderBy: { sentAt: "desc" }, take: 5 },
            assignments: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                toMember: { include: { user: true } },
                fromMember: { include: { user: true } },
                assignedBy: { include: { user: true } },
              },
            },
          },
        },
      },
    });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const campaigns: unknown[] = [];

    const recentCalls = await prisma.crmCallRecord.findMany({
      where: { companyId: session.companyId, contactId: contact.id },
      orderBy: { startedAt: "desc" },
      take: 15,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        assignedMember: { include: { user: { select: { name: true } } } },
        conversation: { select: { id: true } },
      },
    });

    return NextResponse.json({
      contact: {
        ...serializeContactListItem({
          ...contact,
          conversations: contact.conversations.slice(0, 1),
        }),
        notes: contact.notes,
        customFields: contact.customFields,
        waJid: contact.waJid,
        consent: {
          marketingConsent: contact.marketingConsent,
          marketingConsentAt: contact.marketingConsentAt?.toISOString() ?? null,
          consentSource: contact.consentSource,
          optedOutAt: contact.optedOutAt?.toISOString() ?? null,
        },
        recentCalls: recentCalls.map((c) => serializeCallRow(c)),
        conversations: contact.conversations.map((cv) => ({
          id: cv.id,
          status: cv.status,
          priority: cv.priority,
          lastMessageAt: cv.lastMessageAt?.toISOString() ?? null,
          lastMessagePreview: cv.lastMessagePreview,
          assignee: cv.assignedMember
            ? { id: cv.assignedMember.id, name: cv.assignedMember.user.name }
            : null,
          recentMessages: cv.messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            bodyText: m.bodyText,
            sentAt: m.sentAt.toISOString(),
            deliveryStatus: m.deliveryStatus,
          })),
          assignmentHistory: cv.assignments.map((a) => ({
            id: a.id,
            createdAt: a.createdAt.toISOString(),
            note: a.note,
            to: a.toMember?.user.name ?? null,
            from: a.fromMember?.user.name ?? null,
            by: a.assignedBy?.user.name ?? null,
          })),
        })),
        campaigns,
        campaignNote:
          "Campaign participation will appear here when the campaigns module is linked to contacts.",
      },
    });
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const existing = await prisma.crmContact.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canEditContact(session as typeof session & { memberId: string }, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = patchSchema.parse(await req.json());
    if (body.phone) {
      const { digits, display, valid } = normalizePhoneInput(body.phone);
      if (!valid) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
      const dup = await prisma.crmContact.findFirst({
        where: {
          companyId: session.companyId,
          phoneNormalized: digits,
          NOT: { id: existing.id },
        },
      });
      if (dup) {
        return NextResponse.json({ error: "Phone already used by another contact" }, { status: 409 });
      }
      existing.phone = display;
      existing.phoneNormalized = digits;
    }
    if (body.email !== undefined && body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (body.tagIds && !canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {
      lastActivityAt: new Date(),
    };
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.phone) {
      data.phone = existing.phone;
      data.phoneNormalized = existing.phoneNormalized;
    }
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.companyName !== undefined) data.companyName = body.companyName?.trim() || null;
    if (body.source !== undefined) data.source = body.source;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.assignedMemberId !== undefined) data.assignedMemberId = body.assignedMemberId;
    if (body.leadStatus !== undefined) data.leadStatus = body.leadStatus;
    if (body.status !== undefined) data.status = body.status;
    if (body.customFields !== undefined) data.customFields = body.customFields;
    if (body.marketingConsent !== undefined) {
      data.marketingConsent = body.marketingConsent;
      data.marketingConsentAt = body.marketingConsent ? new Date() : null;
      data.consentSource = body.marketingConsent ? "manual_update" : null;
    }
    if (body.status === "DO_NOT_CONTACT") {
      data.optedOutAt = new Date();
    }

    await prisma.$transaction(async (tx) => {
      await tx.crmContact.update({ where: { id: existing.id }, data });
      if (body.tagIds) {
        await tx.crmContactTag.deleteMany({ where: { contactId: existing.id } });
        if (body.tagIds.length) {
          await tx.crmContactTag.createMany({
            data: body.tagIds.map((tagId) => ({ contactId: existing.id, tagId })),
          });
        }
      }
      if (body.status === "DO_NOT_CONTACT") {
        await tx.crmSuppressionEntry.upsert({
          where: {
            companyId_phoneNormalized: {
              companyId: session.companyId,
              phoneNormalized: existing.phoneNormalized,
            },
          },
          create: {
            companyId: session.companyId,
            phoneNormalized: existing.phoneNormalized,
            reason: "manual_dnc",
          },
          update: { reason: "manual_dnc" },
        });
      }
    });

    const updated = await prisma.crmContact.findUnique({
      where: { id: existing.id },
      include: {
        contactTags: { include: { tag: true } },
        assignedMember: { include: { user: true } },
        conversations: {
          take: 1,
          orderBy: { lastMessageAt: "desc" },
          include: { assignedMember: { include: { user: true } } },
        },
      },
    });

    return NextResponse.json({ contact: serializeContactListItem(updated!) });
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const existing = await prisma.crmContact.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.crmContact.update({
      where: { id: existing.id },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ ok: true });
  });
}
