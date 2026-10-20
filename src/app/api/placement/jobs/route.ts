import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { serializeJobPostingPublic, serializePlacementPlan } from "@/lib/placement/serialize";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  const [plans, jobs] = await Promise.all([
    prisma.placementSubscriptionPlan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.jobPosting.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  let applicationMap = new Map<string, string>();

  if (session?.user?.id && session.user.role === "STUDENT") {
    const applications = await prisma.jobApplication.findMany({
      where: { userId: session.user.id },
      select: { jobId: true, appliedAt: true },
    });
    applicationMap = new Map(
      applications.map((a) => [a.jobId, a.appliedAt.toISOString()])
    );
  }

  const serializedJobs = jobs.map((job) => ({
    ...serializeJobPostingPublic(job),
    appliedAt: applicationMap.get(job.id) ?? null,
  }));

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({
      access: "login_required",
      canApply: false,
      jobs: serializedJobs,
      plans: plans.map(serializePlacementPlan),
    });
  }

  const subscribed = await userHasActivePlacementSubscription(session.user.id);
  if (!subscribed) {
    return NextResponse.json({
      access: "subscription_required",
      canApply: false,
      jobs: serializedJobs,
      plans: plans.map(serializePlacementPlan),
    });
  }

  return NextResponse.json({
    access: "full",
    canApply: true,
    jobs: serializedJobs,
    plans: plans.map(serializePlacementPlan),
  });
}
