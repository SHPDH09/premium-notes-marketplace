import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { serializePlacementPlan } from "@/lib/placement/serialize";
import { PublishStatus } from "@prisma/client";

export async function GET() {
  return withAdminJson(async () => {
    const plans = await prisma.placementSubscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ plans: plans.map(serializePlacementPlan) });
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  priceAmount: z.number().min(0).optional(),
  priceLabel: z.string().nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(PublishStatus).optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const plan = await prisma.placementSubscriptionPlan.create({
      data: {
        name: d.name,
        description: d.description ?? null,
        priceAmount: d.priceAmount ?? 0,
        priceLabel: d.priceLabel ?? null,
        durationDays: d.durationDays ?? null,
        status: d.status ?? "ACTIVE",
        sortOrder: d.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ plan: serializePlacementPlan(plan) }, { status: 201 });
  });
}
