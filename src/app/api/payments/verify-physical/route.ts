import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { fetchCashfreeOrder, isPaymentSuccess } from "@/lib/payment/cashfree";
import { fulfillSuccessfulPhysicalOrder } from "@/lib/physical/orders";
import { findPhysicalOrderForStudentPayment } from "@/lib/physical/resolve-order-for-payment";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const body = (await req.json()) as {
    orderId?: string;
    physicalOrderId?: string;
    cashfreeOrderId?: string;
  };

  const order = await findPhysicalOrderForStudentPayment({
    userId: auth.session!.user.id,
    orderId: body.orderId,
    physicalOrderId: body.physicalOrderId,
    cashfreeOrderId: body.cashfreeOrderId,
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.paymentStatus === "SUCCESS") {
    return NextResponse.json({
      status: "SUCCESS",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  }

  if (!order.cashfreeOrderId) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const cf = await fetchCashfreeOrder(order.cashfreeOrderId);
    if (isPaymentSuccess(cf.order_status)) {
      await fulfillSuccessfulPhysicalOrder(order.id, order.cashfreeOrderId);
      return NextResponse.json({
        status: "SUCCESS",
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    }
    return NextResponse.json({ status: cf.order_status, orderId: order.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
