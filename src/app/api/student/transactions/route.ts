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
      refunds: { orderBy: { createdAt: "desc" } },
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
      refundedAmount: decimalToNumber(o.refundedAmount),
      refundReason:
        o.paymentStatus === "REFUNDED" || o.paymentStatus === "PARTIALLY_REFUNDED"
          ? resolveRefundReason(o.refundReason, o.adminNote)
          : null,
      refunds:
        o.refunds.length > 0
          ? o.refunds.map((r) => ({
              amount: decimalToNumber(r.amount),
              reason: r.reason,
              createdAt: r.createdAt.toISOString(),
            }))
          : null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
