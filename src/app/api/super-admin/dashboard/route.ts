import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const [
      companies,
      activeCompanies,
      agents,
      numbers,
      conversations,
      messages,
      webhookFailures,
    ] = await Promise.all([
      prisma.crmCompany.count(),
      prisma.crmCompany.count({ where: { status: "ACTIVE" } }),
      prisma.crmCompanyMember.count({ where: { isActive: true } }),
      prisma.crmWhatsAppAccount.count(),
      prisma.crmConversation.count(),
      prisma.crmMessage.count(),
      prisma.crmWebhookEvent.count({ where: { processed: false, error: { not: null } } }),
    ]);

    return NextResponse.json({
      stats: {
        companies,
        activeCompanies,
        suspendedCompanies: companies - activeCompanies,
        agents,
        connectedNumbers: numbers,
        conversations,
        messages,
        webhookFailures,
      },
    });
  });
}
