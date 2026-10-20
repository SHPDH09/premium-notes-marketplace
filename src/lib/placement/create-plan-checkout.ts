import { prisma } from "@/lib/db";
import { generatePaymentOrderId } from "@/lib/orders";
import { createCashfreeOrder } from "@/lib/payment/cashfree";
import { placementSubscribeReturnUrl } from "@/lib/payment/return-url";
import { fulfillSuccessfulPlacementPlanOrder, planOrderAmount } from "@/lib/placement/fulfill-plan-order";

export async function createPlacementPlanCheckout(params: {
  userId: string;
  userEmail: string;
  userPhone?: string | null;
  userName: string;
  planId: string;
  appBaseUrl: string;
}) {
  const plan = await prisma.placementSubscriptionPlan.findFirst({
    where: { id: params.planId, status: "ACTIVE" },
  });
  if (!plan) throw new Error("Plan not found or disabled.");

  const amount = planOrderAmount(plan);

  const planOrder = await prisma.placementPlanOrder.create({
    data: {
      userId: params.userId,
      planId: plan.id,
      amount,
      paymentStatus: "PENDING",
    },
  });

  if (amount <= 0) {
    await fulfillSuccessfulPlacementPlanOrder(planOrder.id, `free_${planOrder.id}`);
    return { planOrderId: planOrder.id, free: true as const };
  }

  const paymentConfigured = process.env.PAYMENT_API_KEY && process.env.PAYMENT_SECRET;
  if (!paymentConfigured && process.env.ALLOW_DEV_PAYMENT === "true") {
    await fulfillSuccessfulPlacementPlanOrder(planOrder.id, `dev_${planOrder.id}`);
    return { planOrderId: planOrder.id, free: true as const };
  }

  if (!paymentConfigured) {
    throw new Error("Payment gateway is not configured.");
  }

  const cashfreeOrderId = generatePaymentOrderId();
  await prisma.placementPlanOrder.update({
    where: { id: planOrder.id },
    data: { cashfreeOrderId },
  });

  const baseUrl = params.appBaseUrl.replace(/\/$/, "");
  const notifyUrl = `${baseUrl}/api/payments/webhook`;

  const cf = await createCashfreeOrder({
    orderId: cashfreeOrderId,
    amount,
    customerId: params.userId,
    customerEmail: params.userEmail,
    customerPhone: params.userPhone ?? undefined,
    customerName: params.userName,
    returnUrl: placementSubscribeReturnUrl(baseUrl, planOrder.id),
    notifyUrl,
  });

  return {
    planOrderId: planOrder.id,
    paymentSessionId: cf.paymentSessionId,
    cashfreeOrderId: cf.cfOrderId,
  };
}
