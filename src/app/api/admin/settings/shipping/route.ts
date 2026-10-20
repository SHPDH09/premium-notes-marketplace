import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { z } from "zod";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const row =
    (await prisma.shippingSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.shippingSettings.create({ data: { id: "default" } }));

  return NextResponse.json({
    settings: {
      deliveryCharge: decimalToNumber(row.deliveryCharge),
      freeDeliveryThreshold: row.freeDeliveryThreshold
        ? decimalToNumber(row.freeDeliveryThreshold)
        : null,
      processingDays: row.processingDays,
      shippingDays: row.shippingDays,
      shippingEnabled: row.shippingEnabled,
    },
  });
}

const schema = z.object({
  deliveryCharge: z.number().min(0),
  freeDeliveryThreshold: z.number().min(0).nullable().optional(),
  processingDays: z.number().int().min(1),
  shippingDays: z.number().int().min(1),
  shippingEnabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

  const row = await prisma.shippingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data, freeDeliveryThreshold: parsed.data.freeDeliveryThreshold ?? null },
    update: {
      deliveryCharge: parsed.data.deliveryCharge,
      freeDeliveryThreshold: parsed.data.freeDeliveryThreshold ?? null,
      processingDays: parsed.data.processingDays,
      shippingDays: parsed.data.shippingDays,
      shippingEnabled: parsed.data.shippingEnabled,
    },
  });

  return NextResponse.json({
    settings: {
      deliveryCharge: decimalToNumber(row.deliveryCharge),
      freeDeliveryThreshold: row.freeDeliveryThreshold
        ? decimalToNumber(row.freeDeliveryThreshold)
        : null,
      processingDays: row.processingDays,
      shippingDays: row.shippingDays,
      shippingEnabled: row.shippingEnabled,
    },
  });
}
