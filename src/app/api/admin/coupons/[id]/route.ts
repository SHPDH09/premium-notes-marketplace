import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCoupon } from "@/lib/serializers";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(3).max(32).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().positive().optional(),
  maxUsers: z.number().int().positive().nullable().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscount: z.number().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  noteIds: z.array(z.string()).optional(),
  physicalDocumentIds: z.array(z.string()).optional(),
  appliesTo: z.enum(["NOTE", "PHYSICAL", "BOTH"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.noteIds) {
    await prisma.couponNote.deleteMany({ where: { couponId: params.id } });
    if (data.noteIds.length) {
      await prisma.couponNote.createMany({
        data: data.noteIds.map((noteId) => ({ couponId: params.id, noteId })),
      });
    }
  }

  if (data.physicalDocumentIds) {
    await prisma.couponPhysicalDocument.deleteMany({ where: { couponId: params.id } });
    if (data.physicalDocumentIds.length) {
      await prisma.couponPhysicalDocument.createMany({
        data: data.physicalDocumentIds.map((physicalDocumentId) => ({
          couponId: params.id,
          physicalDocumentId,
        })),
      });
    }
  }

  const coupon = await prisma.coupon.update({
    where: { id: params.id },
    data: {
      ...(data.code ? { code: data.code.toUpperCase().trim() } : {}),
      ...(data.discountType ? { discountType: data.discountType } : {}),
      ...(data.discountValue != null ? { discountValue: data.discountValue } : {}),
      ...(data.maxUsers !== undefined ? { maxUsers: data.maxUsers } : {}),
      ...(data.validFrom ? { validFrom: new Date(data.validFrom) } : {}),
      ...(data.validUntil ? { validUntil: new Date(data.validUntil) } : {}),
      ...(data.minPurchaseAmount != null ? { minPurchaseAmount: data.minPurchaseAmount } : {}),
      ...(data.maxDiscount !== undefined ? { maxDiscount: data.maxDiscount } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.appliesTo ? { appliesTo: data.appliesTo } : {}),
    },
    include: { couponNotes: true, couponPhysicalDocuments: true },
  });

  return NextResponse.json({ coupon: serializeCoupon(coupon) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  await prisma.coupon.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
