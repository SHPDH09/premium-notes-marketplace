import { prisma } from "@/lib/db";
import { publicJobBoardWhere } from "@/lib/placement/job-board-visible";
import { decimalToNumber } from "@/lib/utils";

export async function buildPlatformReports() {
  const [
    notesPaidAgg,
    notesOrderCount,
    notesPaidCount,
    recentNoteOrders,
    placementSubsActive,
    placementSubsTotal,
    placementPlanPaidAgg,
    placementPlanPaidCount,
    jobsLiveCount,
    jobsPendingCount,
    jobsWithStats,
    recentApplications,
    totalApplications,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: "SUCCESS" },
      _sum: { totalAmount: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: "SUCCESS" } }),
    prisma.order.findMany({
      where: { paymentStatus: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { note: { select: { title: true } } } },
      },
    }),
    prisma.userPlacementSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.userPlacementSubscription.count(),
    prisma.placementPlanOrder.aggregate({
      where: { paymentStatus: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.placementPlanOrder.count({ where: { paymentStatus: "SUCCESS" } }),
    prisma.jobPosting.count({ where: publicJobBoardWhere }),
    prisma.jobPosting.count({
      where: { source: "STUDENT", reviewStatus: { in: ["PENDING", "APPROVED"] } },
    }),
    prisma.jobPosting.findMany({
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        _count: { select: { applications: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.jobApplication.findMany({
      orderBy: { appliedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true, company: true, source: true, reviewStatus: true } },
      },
    }),
    prisma.jobApplication.count(),
  ]);

  const notesRevenue = decimalToNumber(notesPaidAgg._sum.totalAmount ?? 0);
  const placementRevenue = decimalToNumber(placementPlanPaidAgg._sum.amount ?? 0);

  const jobStats = jobsWithStats.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    source: j.source,
    reviewStatus: j.reviewStatus,
    status: j.status,
    viewCount: j.viewCount,
    applyCount: j._count.applications,
    submittedBy: j.submittedBy
      ? { id: j.submittedBy.id, name: j.submittedBy.name, email: j.submittedBy.email }
      : null,
  }));

  const topJobsByApplies = [...jobStats].sort((a, b) => b.applyCount - a.applyCount).slice(0, 10);
  const topJobsByViews = [...jobStats].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    notes: {
      totalOrders: notesOrderCount,
      paidOrders: notesPaidCount,
      revenue: notesRevenue,
      recentOrders: recentNoteOrders.map((o) => ({
        id: o.id,
        totalAmount: decimalToNumber(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        user: o.user,
        noteTitles: o.items.map((i) => i.note.title),
      })),
    },
    placementSubscriptions: {
      active: placementSubsActive,
      total: placementSubsTotal,
      paidPlanOrders: placementPlanPaidCount,
      revenue: placementRevenue,
    },
    jobs: {
      liveOnBoard: jobsLiveCount,
      pendingStudentReview: jobsPendingCount,
      totalApplications,
      byJob: jobStats,
      topByApplies: topJobsByApplies,
      topByViews: topJobsByViews,
    },
    applications: recentApplications.map((a) => ({
      id: a.id,
      appliedAt: a.appliedAt.toISOString(),
      channel: a.channel,
      user: a.user,
      job: a.job,
    })),
    summary: {
      totalRevenue: notesRevenue + placementRevenue,
      notesRevenue,
      placementRevenue,
    },
  };
}
