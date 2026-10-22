import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import { prisma } from "@/lib/db";

const bulkSchema = z.object({
  contactIds: z.array(z.string()).min(1).max(500),
  action: z.enum(["assign", "add_tags", "remove_tags", "set_status", "archive"]),
  assignedMemberId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DO_NOT_CONTACT"]).optional(),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = bulkSchema.parse(await req.json());
    const contacts = await prisma.crmContact.findMany({
      where: { companyId: session.companyId, id: { in: body.contactIds } },
      select: { id: true, phoneNormalized: true },
    });
    if (contacts.length !== body.contactIds.length) {
      return NextResponse.json({ error: "Some contacts not found" }, { status: 400 });
    }

    let updated = 0;

    if (body.action === "assign") {
      const r = await prisma.crmContact.updateMany({
        where: { id: { in: body.contactIds }, companyId: session.companyId },
        data: { assignedMemberId: body.assignedMemberId ?? null, lastActivityAt: new Date() },
      });
      updated = r.count;
    }

    if (body.action === "set_status" && body.status) {
      const r = await prisma.crmContact.updateMany({
        where: { id: { in: body.contactIds }, companyId: session.companyId },
        data: {
          status: body.status,
          optedOutAt: body.status === "DO_NOT_CONTACT" ? new Date() : undefined,
          lastActivityAt: new Date(),
        },
      });
      updated = r.count;
      if (body.status === "DO_NOT_CONTACT") {
        for (const c of contacts) {
          await prisma.crmSuppressionEntry.upsert({
            where: {
              companyId_phoneNormalized: {
                companyId: session.companyId,
                phoneNormalized: c.phoneNormalized,
              },
            },
            create: {
              companyId: session.companyId,
              phoneNormalized: c.phoneNormalized,
              reason: "bulk_dnc",
            },
            update: { reason: "bulk_dnc" },
          });
        }
      }
    }

    if (body.action === "archive") {
      const r = await prisma.crmContact.updateMany({
        where: { id: { in: body.contactIds }, companyId: session.companyId },
        data: { status: "ARCHIVED", lastActivityAt: new Date() },
      });
      updated = r.count;
    }

    if (body.action === "add_tags" && body.tagIds?.length) {
      for (const contactId of body.contactIds) {
        await prisma.crmContactTag.createMany({
          data: body.tagIds.map((tagId) => ({ contactId, tagId })),
          skipDuplicates: true,
        });
      }
      updated = body.contactIds.length;
    }

    if (body.action === "remove_tags" && body.tagIds?.length) {
      const r = await prisma.crmContactTag.deleteMany({
        where: { contactId: { in: body.contactIds }, tagId: { in: body.tagIds } },
      });
      updated = r.count;
    }

    return NextResponse.json({ ok: true, updated });
  });
}
