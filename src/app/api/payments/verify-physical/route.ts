import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { fetchCashfreeOrder, isPaymentSuccess } from "@/lib/payment/cashfree";
import { fulfillSuccessfulPhysicalOrder } from "@/lib/physical/orders";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const { orderId } = (await req.json()) as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.physicalOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== auth.session!.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.paymentStatus === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS", orderId, orderNumber: order.orderNumber });
  }

  if (!order.cashfreeOrderId) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const cf = await fetchCashfreeOrder(order.cashfreeOrderId);
    if (isPaymentSuccess(cf.order_status)) {
      await fulfillSuccessfulPhysicalOrder(order.id, order.cashfreeOrderId);
      return NextResponse.json({ status: "SUCCESS", orderId, orderNumber: order.orderNumber });
    }
    return NextResponse.json({ status: cf.order_status, orderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
