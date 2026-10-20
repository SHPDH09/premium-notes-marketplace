import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { serializePlacementPlan } from "@/lib/placement/serialize";
import { PublishStatus } from "@prisma/client";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  priceAmount: z.number().min(0).optional(),
  priceLabel: z.string().nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(PublishStatus).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const plan = await prisma.placementSubscriptionPlan.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ plan: serializePlacementPlan(plan) });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const used = await prisma.userPlacementSubscription.count({ where: { planId: params.id } });
    if (used > 0) {
      return NextResponse.json(
        { error: "Cannot delete — students already subscribed. Disable the plan instead." },
        { status: 400 }
      );
    }
    await prisma.placementPlanOrder.deleteMany({ where: { planId: params.id } });
    await prisma.placementSubscriptionPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
