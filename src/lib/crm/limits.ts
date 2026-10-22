import { prisma } from "@/lib/db";

export async function getCompanyLimits(companyId: string) {
  const company = await prisma.crmCompany.findUnique({
    where: { id: companyId },
    include: { subscriptionPlan: true, _count: { select: { whatsappAccounts: true, members: true } } },
  });
  if (!company) return null;
  const plan = company.subscriptionPlan;
  return {
    maxWhatsAppNumbers: plan?.maxWhatsAppNumbers ?? 1,
    maxAgents: plan?.maxAgents ?? 3,
    maxMessagesPerMonth: plan?.maxMessagesPerMonth ?? null,
    callingEnabled: plan?.callingEnabled ?? false,
    currentNumbers: company._count.whatsappAccounts,
    currentAgents: company._count.members,
  };
}

export async function assertCanAddWhatsAppNumber(companyId: string) {
  const limits = await getCompanyLimits(companyId);
  if (!limits) throw new Error("COMPANY_NOT_FOUND");
  if (limits.currentNumbers >= limits.maxWhatsAppNumbers) {
    throw new Error("PLAN_LIMIT_WHATSAPP_NUMBERS");
  }
}
