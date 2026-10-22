import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

const DEFAULT_QUICK_REPLIES = [
  "Thanks for reaching out — we'll get back to you shortly.",
  "Could you share more details about your request?",
  "Our team is reviewing your message and will reply soon.",
];

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const company = await prisma.crmCompany.findUnique({
      where: { id: session.companyId },
      select: { automationSettings: true },
    });
    const settings = (company?.automationSettings as { quickReplies?: string[] } | null) ?? {};
    const replies = settings.quickReplies?.length ? settings.quickReplies : DEFAULT_QUICK_REPLIES;
    return NextResponse.json({ quickReplies: replies });
  });
}
