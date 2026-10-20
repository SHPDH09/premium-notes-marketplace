import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { resolveRefundReason } from "@/lib/refund-reason";
import { orderRefundableRemaining } from "@/lib/orders";
import {
  isWithinRefundWindow,
  maxNetRefundableTotal,
  orderPaymentTime,
  PLATFORM_REFUND_FEE_PERCENT,
  REFUND_WINDOW_HOURS,
  refundWindowExpiresAt,
} from "@/lib/refund-policy";

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

  const placementWhere: Prisma.PlacementPlanOrderWhereInput = {};
  if (paymentStatus) {
    placementWhere.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  }
  if (studentId) placementWhere.userId = studentId;
  if (from || to) {
    placementWhere.createdAt = {};
    if (from) placementWhere.createdAt.gte = new Date(from);
    if (to) placementWhere.createdAt.lte = new Date(to);
  }
  if (q) {
    placementWhere.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { plan: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const includePlacement = !noteId && !transactionStatus;

  const [orders, placementOrders] = await Promise.all([
    prisma.order.findMany({
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
    }),
    includePlacement
      ? prisma.placementPlanOrder.findMany({
          where: placementWhere,
          include: { user: true, plan: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const noteTransactions = orders.map((o) => ({
    kind: "NOTE" as const,
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
    maxNetRefundableTotal: maxNetRefundableTotal(decimalToNumber(o.totalAmount)),
    refundWindowHours: REFUND_WINDOW_HOURS,
    platformFeePercent: PLATFORM_REFUND_FEE_PERCENT,
    refundDeadline:
      o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED"
        ? refundWindowExpiresAt(orderPaymentTime(o)).toISOString()
        : null,
    refundWindowOpen:
      o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED"
        ? isWithinRefundWindow(orderPaymentTime(o))
        : false,
    canRefund:
      (o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED") &&
      isWithinRefundWindow(orderPaymentTime(o)) &&
      orderRefundableRemaining(o.totalAmount, o.refundedAmount) > 0,
    date: o.createdAt.toISOString(),
  }));

  const placementTransactions = placementOrders.map((o) => ({
    kind: "PLACEMENT" as const,
    id: o.id,
    orderId: o.id,
    transactionId: o.cashfreeOrderId,
    studentName: o.user.name,
    studentEmail: o.user.email,
    noteName: `Placement plan: ${o.plan.name}`,
    noteIds: [] as string[],
    amount: decimalToNumber(o.amount),
    discount: 0,
    coupon: null,
    finalAmount: decimalToNumber(o.amount),
    paymentStatus: o.paymentStatus,
    transactionStatus: o.paymentStatus,
    adminNote: null,
    refundReason: null,
    refundedAmount: 0,
    refundableRemaining: 0,
    refunds: [] as { amount: number; reason: string; createdAt: string }[],
    maxNetRefundableTotal: 0,
    refundWindowHours: REFUND_WINDOW_HOURS,
    platformFeePercent: PLATFORM_REFUND_FEE_PERCENT,
    refundDeadline: null,
    refundWindowOpen: false,
    canRefund: false,
    date: o.createdAt.toISOString(),
  }));

  const transactions = [...noteTransactions, ...placementTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);

  return NextResponse.json({ transactions });
}
