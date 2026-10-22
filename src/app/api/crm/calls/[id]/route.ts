import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { CALL_OUTCOMES, getCallCapabilities } from "@/lib/crm/calls/capabilities";
import { serializeCallRow } from "@/lib/crm/calls/serialize";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  internalNotes: z.string().max(10000).optional().nullable(),
  outcome: z.enum(CALL_OUTCOMES).optional().nullable(),
  assignedMemberId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});

async function loadCall(id: string, companyId: string, memberId: string, isAdmin: boolean) {
  const call = await prisma.crmCallRecord.findFirst({
    where: { id, companyId },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      assignedMember: { include: { user: { select: { name: true } } } },
      conversation: { select: { id: true } },
    },
  });
  if (!call) return null;
  if (!isAdmin && call.assignedMemberId && call.assignedMemberId !== memberId) {
    return "forbidden" as const;
  }
  return call;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.memberRole === "COMPANY_ADMIN" || session.role === "COMPANY_ADMIN";
    const call = await loadCall(ctx.params.id, session.companyId, session.memberId, isAdmin);
    if (call === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const capabilities = await getCallCapabilities(session.companyId);

    return NextResponse.json({
      call: serializeCallRow(call, { includeRecording: true }),
      capabilities,
    });
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.memberRole === "COMPANY_ADMIN" || session.role === "COMPANY_ADMIN";
    const existing = await loadCall(ctx.params.id, session.companyId, session.memberId, isAdmin);
    if (existing === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (parsed.data.assignedMemberId && !isAdmin) {
      return NextResponse.json({ error: "Only admins can reassign calls" }, { status: 403 });
    }

    if (parsed.data.assignedMemberId) {
      const member = await prisma.crmCompanyMember.findFirst({
        where: { id: parsed.data.assignedMemberId, companyId: session.companyId, isActive: true },
      });
      if (!member) return NextResponse.json({ error: "Agent not found" }, { status: 400 });
    }

    if (parsed.data.contactId) {
      const contact = await prisma.crmContact.findFirst({
        where: { id: parsed.data.contactId, companyId: session.companyId },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 400 });
    }

    const updated = await prisma.crmCallRecord.update({
      where: { id: existing.id },
      data: {
        internalNotes:
          parsed.data.internalNotes !== undefined ? parsed.data.internalNotes : undefined,
        outcome: parsed.data.outcome !== undefined ? parsed.data.outcome : undefined,
        assignedMemberId:
          parsed.data.assignedMemberId !== undefined ? parsed.data.assignedMemberId : undefined,
        contactId: parsed.data.contactId !== undefined ? parsed.data.contactId : undefined,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        assignedMember: { include: { user: { select: { name: true } } } },
        conversation: { select: { id: true } },
      },
    });

    return NextResponse.json({ call: serializeCallRow(updated) });
  });
}
