import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { resolveRefundReason } from "@/lib/refund-reason";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const orders = await prisma.order.findMany({
    where: { userId: auth.session!.user.id },
    include: {
      coupon: true,
      items: { include: { note: true } },
      transaction: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    transactions: orders.map((o) => ({
      id: o.transaction?.id ?? o.id,
      orderId: o.id,
      transactionId: o.transaction?.transactionId ?? o.cashfreeOrderId,
      note: o.items.map((i) => i.note.title).join(", "),
      amount: decimalToNumber(o.subtotal),
      discount: decimalToNumber(o.discount),
      coupon: o.coupon?.code ?? null,
      couponDiscount: decimalToNumber(o.couponDiscount),
      finalAmount: decimalToNumber(o.totalAmount),
      paymentStatus: o.paymentStatus,
      transactionStatus: o.transactionStatus,
      refundReason:
        o.paymentStatus === "REFUNDED"
          ? resolveRefundReason(o.refundReason, o.adminNote)
          : null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
