import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { serializeJobPosting, serializePlacementPlan } from "@/lib/placement/serialize";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  const plans = await prisma.placementSubscriptionPlan.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({
      access: "login_required",
      jobs: [],
      plans: plans.map(serializePlacementPlan),
    });
  }

  const subscribed = await userHasActivePlacementSubscription(session.user.id);
  if (!subscribed) {
    return NextResponse.json({
      access: "subscription_required",
      jobs: [],
      plans: plans.map(serializePlacementPlan),
    });
  }

  const jobs = await prisma.jobPosting.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    access: "full",
    jobs: jobs.map(serializeJobPosting),
    plans: plans.map(serializePlacementPlan),
  });
}
