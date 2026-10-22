import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fulfillSuccessfulOrder } from "@/lib/orders";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    data?: { order?: { order_id?: string; order_status?: string } };
    order_id?: string;
    order_status?: string;
  };

  const orderId =
    body.data?.order?.order_id ?? body.order_id;
  const status = body.data?.order?.order_status ?? body.order_status;

  if (!orderId) {
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findUnique({ where: { cashfreeOrderId: orderId } });
  if (order) {
    if (status === "PAID" || status === "SUCCESS") {
      await fulfillSuccessfulOrder(order.id, orderId);
    } else if (status === "FAILED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", transactionStatus: "FAILED" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const placementPlanOrder = await prisma.placementPlanOrder.findUnique({
    where: { cashfreeOrderId: orderId },
  });
  if (placementPlanOrder) {
    const { fulfillSuccessfulPlacementPlanOrder } = await import("@/lib/placement/fulfill-plan-order");
    if (status === "PAID" || status === "SUCCESS") {
      await fulfillSuccessfulPlacementPlanOrder(placementPlanOrder.id, orderId);
    } else if (status === "FAILED") {
      await prisma.placementPlanOrder.update({
        where: { id: placementPlanOrder.id },
        data: { paymentStatus: "FAILED" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const crmSubOrder = await prisma.crmSubscriptionOrder.findUnique({
    where: { cashfreeOrderId: orderId },
  });
  if (crmSubOrder) {
    const { fulfillCrmSubscriptionOrder } = await import("@/lib/crm/subscription/fulfill-order");
    if (status === "PAID" || status === "SUCCESS") {
      await fulfillCrmSubscriptionOrder(crmSubOrder.id, orderId);
    } else if (status === "FAILED") {
      await prisma.crmSubscriptionOrder.update({
        where: { id: crmSubOrder.id },
        data: { paymentStatus: "FAILED" },
      });
      await prisma.crmCompany.update({
        where: { id: crmSubOrder.companyId },
        data: { subscriptionStatus: "PAST_DUE" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const physicalOrder = await prisma.physicalOrder.findUnique({ where: { cashfreeOrderId: orderId } });
  if (!physicalOrder) return NextResponse.json({ ok: true });

  const { fulfillSuccessfulPhysicalOrder } = await import("@/lib/physical/orders");
  if (status === "PAID" || status === "SUCCESS") {
    await fulfillSuccessfulPhysicalOrder(physicalOrder.id, orderId);
  } else if (status === "FAILED") {
    await prisma.physicalOrder.update({
      where: { id: physicalOrder.id },
      data: { paymentStatus: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
