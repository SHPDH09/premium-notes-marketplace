import type { PlacementSubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";

export async function fulfillSuccessfulPlacementPlanOrder(
  planOrderId: string,
  cashfreeOrderId: string
) {
  const order = await prisma.placementPlanOrder.findUnique({
    where: { id: planOrderId },
    include: { plan: true },
  });
  if (!order || order.paymentStatus === "SUCCESS") return;

  const days = order.plan.durationDays;
  const endsAt =
    days != null && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.placementPlanOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "SUCCESS",
        cashfreeOrderId: cashfreeOrderId || order.cashfreeOrderId,
      },
    });

    await tx.userPlacementSubscription.updateMany({
      where: { userId: order.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    await tx.userPlacementSubscription.create({
      data: {
        userId: order.userId,
        planId: order.planId,
        status: "ACTIVE",
        endsAt,
      },
    });
  });
}

export function planOrderAmount(plan: Pick<PlacementSubscriptionPlan, "priceAmount">) {
  return decimalToNumber(plan.priceAmount);
}
