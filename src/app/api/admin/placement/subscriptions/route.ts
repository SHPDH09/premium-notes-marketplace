import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";

export async function GET() {
  return withAdminJson(async () => {
    const rows = await prisma.userPlacementSubscription.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      subscriptions: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        planId: r.planId,
        planName: r.plan.name,
        status: r.status,
        startsAt: r.startsAt.toISOString(),
        endsAt: r.endsAt?.toISOString() ?? null,
      })),
    });
  });
}

const grantSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  durationDays: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const parsed = grantSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, planId, durationDays } = parsed.data;
    const [user, plan] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, role: "STUDENT" } }),
      prisma.placementSubscriptionPlan.findUnique({ where: { id: planId } }),
    ]);
    if (!user || !plan) {
      return NextResponse.json({ error: "Invalid student or plan" }, { status: 400 });
    }

    const days = durationDays ?? plan.durationDays;
    const endsAt =
      days != null ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    await prisma.userPlacementSubscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const sub = await prisma.userPlacementSubscription.create({
      data: {
        userId,
        planId,
        status: "ACTIVE",
        endsAt,
      },
    });

    return NextResponse.json(
      {
        subscription: {
          id: sub.id,
          userId: sub.userId,
          planId: sub.planId,
          status: sub.status,
          endsAt: sub.endsAt?.toISOString() ?? null,
        },
      },
      { status: 201 }
    );
  });
}
