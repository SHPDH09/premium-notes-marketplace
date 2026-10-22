import { prisma } from "@/lib/db";
import type { CrmSubscriptionPlan } from "@prisma/client";

export type PlanEntitlements = {
  maxAgents: number | null;
  maxWhatsAppNumbers: number | null;
  maxCampaignMessagesPerMonth: number | null;
  maxContacts: number | null;
  maxAutomationWorkflows: number | null;
  maxAiRequestsPerMonth: number | null;
  maxTeamInboxes: number | null;
  reportsAccess: "none" | "basic" | "advanced";
  contactImportExport: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  advancedPermissions: boolean;
  callManagement: boolean;
  maxStorageMb: number | null;
  automationEnabled: boolean;
  aiAssistEnabled: boolean;
};

function fromPlan(plan: CrmSubscriptionPlan | null): PlanEntitlements {
  const extra = (plan?.entitlements as Partial<PlanEntitlements> | null) ?? {};
  return {
    maxAgents: extra.maxAgents ?? plan?.maxAgents ?? 1,
    maxWhatsAppNumbers: extra.maxWhatsAppNumbers ?? plan?.maxWhatsAppNumbers ?? 1,
    maxCampaignMessagesPerMonth:
      extra.maxCampaignMessagesPerMonth ?? plan?.maxMessagesPerMonth ?? null,
    maxContacts: extra.maxContacts ?? null,
    maxAutomationWorkflows: extra.maxAutomationWorkflows ?? null,
    maxAiRequestsPerMonth: extra.maxAiRequestsPerMonth ?? null,
    maxTeamInboxes: extra.maxTeamInboxes ?? 1,
    reportsAccess: extra.reportsAccess ?? "basic",
    contactImportExport: extra.contactImportExport ?? true,
    apiAccess: extra.apiAccess ?? plan?.apiAccessEnabled ?? false,
    customBranding: extra.customBranding ?? plan?.whiteLabelEnabled ?? false,
    advancedPermissions: extra.advancedPermissions ?? false,
    callManagement: extra.callManagement ?? plan?.callingEnabled ?? false,
    maxStorageMb: extra.maxStorageMb ?? plan?.maxMediaStorageMb ?? null,
    automationEnabled: extra.automationEnabled ?? plan?.automationEnabled ?? false,
    aiAssistEnabled: extra.aiAssistEnabled ?? plan?.aiAssistEnabled ?? false,
  };
}

export async function getCompanyEntitlements(companyId: string) {
  const company = await prisma.crmCompany.findUnique({
    where: { id: companyId },
    include: { subscriptionPlan: true },
  });
  if (!company) throw new Error("NOT_FOUND");

  const entitlements = fromPlan(company.subscriptionPlan);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [agentCount, whatsappCount, contactCount, campaignSent, messagesOut] = await Promise.all([
    prisma.crmCompanyMember.count({ where: { companyId, isActive: true } }),
    prisma.crmWhatsAppAccount.count({ where: { companyId } }),
    prisma.crmContact.count({ where: { companyId, status: { not: "ARCHIVED" } } }),
    prisma.crmCampaignRecipient.count({
      where: {
        campaign: { companyId },
        status: { in: ["SENT", "DELIVERED", "READ"] },
        sentAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.crmMessage.count({
      where: {
        conversation: { companyId },
        direction: "OUTBOUND",
        sentAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  return {
    company: {
      id: company.id,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionExpiresAt: company.subscriptionExpiresAt?.toISOString() ?? null,
      trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
      billingCycle: company.billingCycle,
      plan: company.subscriptionPlan
        ? {
            id: company.subscriptionPlan.id,
            name: company.subscriptionPlan.name,
            planCode: company.subscriptionPlan.planCode,
          }
        : null,
    },
    entitlements,
    usage: {
      agents: agentCount,
      whatsappNumbers: whatsappCount,
      contacts: contactCount,
      campaignMessagesThisMonth: campaignSent,
      outboundMessagesThisMonth: messagesOut,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  };
}

export function checkLimit(
  limit: number | null | undefined,
  used: number
): { ok: true } | { ok: false; message: string } {
  if (limit == null) return { ok: true };
  if (used >= limit) {
    return { ok: false, message: `Plan limit reached (${used}/${limit}). Upgrade to continue.` };
  }
  return { ok: true };
}
