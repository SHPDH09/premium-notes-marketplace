import { randomUUID } from "node:crypto";
import type { CrmBillingInterval } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generatePaymentOrderId } from "@/lib/orders";
import { createCashfreeOrder } from "@/lib/payment/cashfree";
import { crmSubscriptionReturnUrl } from "@/lib/payment/return-url";
import { planPriceForCycle } from "@/lib/crm/subscription/pricing";
import { fulfillCrmSubscriptionOrder } from "@/lib/crm/subscription/fulfill-order";

export async function createCrmSubscriptionCheckout(params: {
  companyId: string;
  planId: string;
  billingCycle: CrmBillingInterval;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  appBaseUrl: string;
  actorUserId: string;
}) {
  const plan = await prisma.crmSubscriptionPlan.findFirst({
    where: { id: params.planId, isActive: true, archivedAt: null },
  });
  if (!plan) throw new Error("Plan not found or inactive");

  const amountInr = planPriceForCycle(plan, params.billingCycle);
  const idempotencyKey = `crm-sub-${params.companyId}-${params.planId}-${params.billingCycle}-${randomUUID()}`;

  const order = await prisma.crmSubscriptionOrder.create({
    data: {
      companyId: params.companyId,
      planId: plan.id,
      billingCycle: params.billingCycle,
      amountInr,
      paymentStatus: "PENDING",
      idempotencyKey,
    },
  });

  await prisma.crmSubscriptionHistory.create({
    data: {
      companyId: params.companyId,
      planId: plan.id,
      action: "checkout_started",
      actorUserId: params.actorUserId,
      detail: { orderId: order.id, amountInr, billingCycle: params.billingCycle },
    },
  });

  if (amountInr <= 0) {
    await fulfillCrmSubscriptionOrder(order.id, `free_${order.id}`);
    return { orderId: order.id, free: true as const };
  }

  const paymentConfigured = process.env.PAYMENT_API_KEY && process.env.PAYMENT_SECRET;
  if (!paymentConfigured && process.env.ALLOW_DEV_PAYMENT === "true") {
    await fulfillCrmSubscriptionOrder(order.id, `dev_${order.id}`);
    return { orderId: order.id, free: true as const };
  }
  if (!paymentConfigured) throw new Error("Payment gateway is not configured.");

  const cashfreeOrderId = generatePaymentOrderId();
  await prisma.crmSubscriptionOrder.update({
    where: { id: order.id },
    data: { cashfreeOrderId, paymentStatus: "PENDING" },
  });

  await prisma.crmCompany.update({
    where: { id: params.companyId },
    data: { subscriptionStatus: "PAYMENT_PENDING" },
  });

  const baseUrl = params.appBaseUrl.replace(/\/$/, "");
  const cf = await createCashfreeOrder({
    orderId: cashfreeOrderId,
    amount: amountInr,
    customerId: params.companyId,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    customerName: params.customerName,
    returnUrl: crmSubscriptionReturnUrl(baseUrl, order.id),
    notifyUrl: `${baseUrl}/api/payments/webhook`,
  });

  return {
    orderId: order.id,
    paymentSessionId: cf.paymentSessionId,
    cashfreeOrderId: cf.cfOrderId,
    amountInr,
  };
}
