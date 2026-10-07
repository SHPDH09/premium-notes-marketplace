import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCoupon } from "@/lib/serializers";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(3).max(32),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxUsers: z.number().int().positive().nullable().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  minPurchaseAmount: z.number().min(0).default(0),
  maxDiscount: z.number().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  noteIds: z.array(z.string()).optional(),
  physicalDocumentIds: z.array(z.string()).optional(),
  appliesTo: z.enum(["NOTE", "PHYSICAL", "BOTH"]).default("NOTE"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const coupons = await prisma.coupon.findMany({
    where: q ? { code: { contains: q.toUpperCase(), mode: "insensitive" } } : undefined,
    include: { couponNotes: true, couponPhysicalDocuments: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ coupons: coupons.map(serializeCoupon) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase().trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUsers: data.maxUsers ?? null,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      minPurchaseAmount: data.minPurchaseAmount,
      maxDiscount: data.maxDiscount ?? null,
      status: data.status,
      appliesTo: data.appliesTo,
      couponNotes: data.noteIds?.length
        ? { create: data.noteIds.map((noteId) => ({ noteId })) }
        : undefined,
      couponPhysicalDocuments: data.physicalDocumentIds?.length
        ? { create: data.physicalDocumentIds.map((physicalDocumentId) => ({ physicalDocumentId })) }
        : undefined,
    },
    include: { couponNotes: true, couponPhysicalDocuments: true },
  });

  return NextResponse.json({ coupon: serializeCoupon(coupon) }, { status: 201 });
}
