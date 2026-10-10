import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { printingQueueDashboardCountWhere } from "@/lib/physical/printing-queue";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [
    totalStudents,
    totalNotes,
    totalPurchases,
    revenueAgg,
    totalTransactions,
    activeCoupons,
    recentPurchases,
    recentStudents,
    recentTransactions,
    topNotes,
    totalPhysicalOrders,
    paidPhysicalOrders,
    physicalRevenueAgg,
    printingQueueCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.note.count(),
    prisma.purchase.count(),
    prisma.order.aggregate({
      where: { paymentStatus: "SUCCESS" },
      _sum: { totalAmount: true },
    }),
    prisma.transaction.count(),
    prisma.coupon.count({
      where: { status: "ACTIVE", validUntil: { gte: new Date() } },
    }),
    prisma.purchase.findMany({
      take: 8,
      orderBy: { purchasedAt: "desc" },
      include: { user: true, note: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true, order: { include: { items: { include: { note: true } } } } },
    }),
    prisma.note.findMany({
      take: 5,
      orderBy: { purchaseCount: "desc" },
    }),
    prisma.physicalOrder.count(),
    prisma.physicalOrder.count({ where: { paymentStatus: "SUCCESS" } }),
    prisma.physicalOrder.aggregate({
      where: { paymentStatus: "SUCCESS" },
      _sum: { totalAmount: true },
    }),
    prisma.printingJob.count({
      where: printingQueueDashboardCountWhere(),
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalStudents,
      totalNotes,
      totalPurchases,
      totalRevenue: decimalToNumber(revenueAgg._sum.totalAmount ?? 0),
      totalTransactions,
      activeCoupons,
      totalPhysicalOrders,
      paidPhysicalOrders,
      physicalRevenue: decimalToNumber(physicalRevenueAgg._sum.totalAmount ?? 0),
      printingQueueCount,
    },
    recentPurchases: recentPurchases.map((p) => ({
      id: p.id,
      student: p.user.name,
      note: p.note.title,
      amount: decimalToNumber(p.purchasedPrice),
      at: p.purchasedAt.toISOString(),
    })),
    recentStudents: recentStudents.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      at: s.createdAt.toISOString(),
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      transactionId: t.transactionId,
      student: t.user.name,
      note: t.order.items[0]?.note.title,
      amount: decimalToNumber(t.amount),
      status: t.paymentStatus,
      at: t.createdAt.toISOString(),
    })),
    topNotes: topNotes.map((n) => ({
      id: n.id,
      title: n.title,
      purchaseCount: n.purchaseCount,
      finalPrice: decimalToNumber(n.finalPrice),
    })),
  });
}
