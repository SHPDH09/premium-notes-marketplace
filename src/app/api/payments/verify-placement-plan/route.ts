import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { fetchCashfreeOrder, isPaymentSuccess } from "@/lib/payment/cashfree";
import { fulfillSuccessfulPlacementPlanOrder } from "@/lib/placement/fulfill-plan-order";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { planOrderId?: string; orderId?: string };
  const userId = auth.session!.user.id;

  let planOrder =
    body.planOrderId != null
      ? await prisma.placementPlanOrder.findFirst({
          where: { id: body.planOrderId, userId },
        })
      : null;

  if (!planOrder && body.orderId) {
    planOrder = await prisma.placementPlanOrder.findFirst({
      where: {
        userId,
        OR: [{ cashfreeOrderId: body.orderId }, { id: body.orderId }],
      },
    });
  }

  if (!planOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (planOrder.paymentStatus === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS", planOrderId: planOrder.id });
  }

  if (!planOrder.cashfreeOrderId) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const cf = await fetchCashfreeOrder(planOrder.cashfreeOrderId);
    if (isPaymentSuccess(cf.order_status)) {
      await fulfillSuccessfulPlacementPlanOrder(planOrder.id, planOrder.cashfreeOrderId);
      return NextResponse.json({ status: "SUCCESS", planOrderId: planOrder.id });
    }
    return NextResponse.json({ status: cf.order_status, planOrderId: planOrder.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
