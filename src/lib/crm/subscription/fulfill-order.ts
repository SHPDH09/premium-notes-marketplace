import { prisma } from "@/lib/db";
import { subscriptionPeriodEnd } from "@/lib/crm/subscription/pricing";

export async function fulfillCrmSubscriptionOrder(orderId: string, cashfreeOrderId: string) {
  const order = await prisma.crmSubscriptionOrder.findUnique({
    where: { id: orderId },
    include: { plan: true, company: true },
  });
  if (!order || order.paymentStatus === "SUCCESS") return;

  const now = new Date();
  const expiresAt = subscriptionPeriodEnd(now, order.billingCycle);

  await prisma.$transaction([
    prisma.crmSubscriptionOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "SUCCESS",
        cashfreeOrderId: cashfreeOrderId || order.cashfreeOrderId,
        verifiedAt: now,
      },
    }),
    prisma.crmCompany.update({
      where: { id: order.companyId },
      data: {
        subscriptionPlanId: order.planId,
        subscriptionStatus: "ACTIVE",
        subscriptionStartedAt: order.company.subscriptionStartedAt ?? now,
        subscriptionExpiresAt: expiresAt,
        billingCycle: order.billingCycle,
        trialEndsAt: null,
      },
    }),
    prisma.crmSubscriptionHistory.create({
      data: {
        companyId: order.companyId,
        planId: order.planId,
        fromPlanId: order.company.subscriptionPlanId,
        action: "subscription_activated",
        detail: {
          orderId: order.id,
          amountInr: order.amountInr,
          billingCycle: order.billingCycle,
          cashfreeOrderId,
        },
      },
    }),
    prisma.crmAuditLog.create({
      data: {
        companyId: order.companyId,
        action: "subscription.payment_success",
        entity: "crm_subscription_order",
        entityId: order.id,
        detail: { planId: order.planId, billingCycle: order.billingCycle },
      },
    }),
  ]);
}
