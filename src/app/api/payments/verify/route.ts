import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { fetchCashfreeOrder, isPaymentSuccess } from "@/lib/payment/cashfree";
import { fulfillSuccessfulOrder } from "@/lib/orders";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { orderId?: string; appOrderId?: string };
  const userId = auth.session!.user.id;

  let order =
    body.appOrderId != null
      ? await prisma.order.findFirst({ where: { id: body.appOrderId, userId } })
      : null;

  if (!order && body.orderId) {
    if (body.orderId.startsWith("ord_")) {
      order = await prisma.order.findFirst({
        where: { cashfreeOrderId: body.orderId, userId },
      });
    } else {
      order = await prisma.order.findFirst({ where: { id: body.orderId, userId } });
    }
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.paymentStatus === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS", orderId: order.id });
  }

  if (!order.cashfreeOrderId) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const cf = await fetchCashfreeOrder(order.cashfreeOrderId);
    if (isPaymentSuccess(cf.order_status)) {
      await fulfillSuccessfulOrder(order.id, order.cashfreeOrderId);
      return NextResponse.json({ status: "SUCCESS", orderId: order.id });
    }
    return NextResponse.json({ status: cf.order_status, orderId: order.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
