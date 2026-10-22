import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getCallCapabilities } from "@/lib/crm/calls/capabilities";
import { formatDisplayPhone, normalizePhoneInput } from "@/lib/crm/phone";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  contactId: z.string().optional(),
  conversationId: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const capabilities = await getCallCapabilities(session.companyId);

    let phone = parsed.data.phone?.trim() ?? "";
    let contactId = parsed.data.contactId;
    let conversationId = parsed.data.conversationId;

    if (parsed.data.conversationId) {
      const conv = await prisma.crmConversation.findFirst({
        where: { id: parsed.data.conversationId, companyId: session.companyId },
        include: { contact: true },
      });
      if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      phone = conv.contact.phone;
      contactId = conv.contactId;
      conversationId = conv.id;
    } else if (parsed.data.contactId) {
      const contact = await prisma.crmContact.findFirst({
        where: { id: parsed.data.contactId, companyId: session.companyId },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      phone = contact.phone;
      contactId = contact.id;
    }

    const normalized = normalizePhoneInput(phone);
    if (!normalized.valid) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    if (capabilities.outgoingProvider) {
      return NextResponse.json(
        {
          error: "Outgoing WhatsApp calling is not enabled for this integration yet.",
          capabilities,
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      ok: true,
      method: "device_dial",
      telUrl: `tel:${formatDisplayPhone(normalized.digits)}`,
      contactId: contactId ?? null,
      conversationId: conversationId ?? null,
      capabilities,
      message:
        "WhatsApp outbound calling is not available via WALayer. Opening your device dialer does not create a CRM call record until an incoming webhook or manual log is supported.",
    });
  });
}
