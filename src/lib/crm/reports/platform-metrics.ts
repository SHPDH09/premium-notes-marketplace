import { prisma } from "@/lib/db";
import { getCompanyLimits } from "@/lib/crm/limits";

export async function buildPlatformReportOverview(from: Date, to: Date) {
  const [
    companies,
    activeCompanies,
    agents,
    activeAgents,
    numbers,
    connectedNumbers,
    conversations,
    messages,
    inbound,
    outbound,
    campaigns,
    campaignRecipients,
    webhookFailures,
    callRecords,
  ] = await Promise.all([
    prisma.crmCompany.count(),
    prisma.crmCompany.count({ where: { status: "ACTIVE" } }),
    prisma.crmCompanyMember.count(),
    prisma.crmCompanyMember.count({ where: { isActive: true } }),
    prisma.crmWhatsAppAccount.count(),
    prisma.crmWhatsAppAccount.count({ where: { status: "CONNECTED" } }),
    prisma.crmConversation.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.crmMessage.count({ where: { sentAt: { gte: from, lte: to } } }),
    prisma.crmMessage.count({ where: { sentAt: { gte: from, lte: to }, direction: "INBOUND" } }),
    prisma.crmMessage.count({ where: { sentAt: { gte: from, lte: to }, direction: "OUTBOUND" } }),
    prisma.crmCampaign.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.crmCampaignRecipient.count({
      where: { campaign: { companyId: { not: "" } }, createdAt: { gte: from, lte: to } },
    }),
    prisma.crmWebhookEvent.count({ where: { error: { not: null }, createdAt: { gte: from, lte: to } } }),
    prisma.crmCallRecord.count({ where: { startedAt: { gte: from, lte: to } } }),
  ]);

  const deliveryFailed = await prisma.crmMessage.count({
    where: { sentAt: { gte: from, lte: to }, deliveryStatus: "FAILED" },
  });

  return {
    companies: { total: companies, active: activeCompanies, suspended: companies - activeCompanies },
    agents: { total: agents, active: activeAgents },
    whatsapp: { totalNumbers: numbers, connected: connectedNumbers },
    conversations,
    messages: { total: messages, inbound, outbound, deliveryFailed },
    campaigns: { total: campaigns, recipients: campaignRecipients },
    calls: { total: callRecords, note: "Incoming call events only via WALayer webhook." },
    webhookFailures,
    revenue: { available: false, note: "Billing checkout not integrated — plan price stored but revenue not aggregated." },
  };
}

export async function buildCompanyPerformanceTable(from: Date, to: Date) {
  const companies = await prisma.crmCompany.findMany({
    include: {
      subscriptionPlan: true,
      _count: {
        select: {
          members: true,
          whatsappAccounts: true,
          conversations: true,
          campaigns: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = [];
  for (const c of companies) {
    const messages = await prisma.crmMessage.count({
      where: { sentAt: { gte: from, lte: to }, conversation: { companyId: c.id } },
    });
    const failed = await prisma.crmMessage.count({
      where: {
        sentAt: { gte: from, lte: to },
        deliveryStatus: "FAILED",
        conversation: { companyId: c.id },
      },
    });
    const lastActivity = await prisma.crmConversation.findFirst({
      where: { companyId: c.id },
      orderBy: { lastMessageAt: "desc" },
      select: { lastMessageAt: true },
    });
    const limits = await getCompanyLimits(c.id);
    const campaignRecipients = await prisma.crmCampaignRecipient.count({
      where: { campaign: { companyId: c.id }, createdAt: { gte: from, lte: to } },
    });

    rows.push({
      id: c.id,
      name: c.name,
      status: c.status,
      plan: c.subscriptionPlan?.name ?? "—",
      whatsappNumbers: c._count.whatsappAccounts,
      agents: c._count.members,
      conversations: c._count.conversations,
      messagesInRange: messages,
      campaigns: c._count.campaigns,
      campaignRecipientsInRange: campaignRecipients,
      failedMessagesInRange: failed,
      limits: limits
        ? {
            maxAgents: limits.maxAgents,
            currentAgents: limits.currentAgents,
            maxWhatsAppNumbers: limits.maxWhatsAppNumbers,
            currentNumbers: limits.currentNumbers,
            maxMessagesPerMonth: limits.maxMessagesPerMonth,
          }
        : null,
      lastActivityAt: lastActivity?.lastMessageAt?.toISOString() ?? null,
    });
  }

  return rows;
}
