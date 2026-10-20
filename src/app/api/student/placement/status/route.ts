import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getActivePlacementSubscription } from "@/lib/placement/subscription";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  const [profile, sub] = await Promise.all([
    prisma.studentCareerProfile.findUnique({ where: { userId } }),
    getActivePlacementSubscription(userId),
  ]);

  return NextResponse.json({
    subscribed: !!sub,
    subscription: sub
      ? {
          planName: sub.plan.name,
          endsAt: sub.endsAt?.toISOString() ?? null,
        }
      : null,
    hasResume: !!profile?.resumeStorageKey,
    hasResumeText: !!(profile?.resumeText && profile.resumeText.trim().length > 20),
  });
}
