import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { resolveRefundReason } from "@/lib/refund-reason";
import { orderRefundableRemaining } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const studentId = sp.get("studentId");
  const noteId = sp.get("noteId");
  const paymentStatus = sp.get("paymentStatus");
  const transactionStatus = sp.get("transactionStatus");
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Prisma.OrderWhereInput = {};
  if (paymentStatus) where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  if (transactionStatus) {
    where.transactionStatus = transactionStatus as Prisma.EnumTransactionStatusFilter["equals"];
  }
  if (studentId) where.userId = studentId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (noteId) where.items = { some: { noteId } };
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { items: { some: { note: { title: { contains: q, mode: "insensitive" } } } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: true,
      coupon: true,
      items: { include: { note: true } },
      transaction: true,
      refunds: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    transactions: orders.map((o) => ({
      id: o.transaction?.id ?? o.id,
      orderId: o.id,
      transactionId: o.transaction?.transactionId ?? o.cashfreeOrderId,
      studentName: o.user.name,
      studentEmail: o.user.email,
      noteName: o.items.map((i) => i.note.title).join(", "),
      noteIds: o.items.map((i) => i.noteId),
      amount: decimalToNumber(o.subtotal),
      discount: decimalToNumber(o.discount),
      coupon: o.coupon?.code ?? null,
      finalAmount: decimalToNumber(o.totalAmount),
      paymentStatus: o.paymentStatus,
      transactionStatus: o.transactionStatus,
      adminNote: o.adminNote,
      refundReason: resolveRefundReason(o.refundReason, o.adminNote),
      refundedAmount: decimalToNumber(o.refundedAmount),
      refundableRemaining: orderRefundableRemaining(o.totalAmount, o.refundedAmount),
      refunds: o.refunds.map((r) => ({
        amount: decimalToNumber(r.amount),
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      canRefund:
        o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED",
      date: o.createdAt.toISOString(),
    })),
  });
}
