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
  if (!order) return NextResponse.json({ ok: true });

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
