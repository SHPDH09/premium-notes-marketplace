import { Coupon, CouponNote, CouponPhysicalDocument, DiscountType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateCouponDiscount, roundMoney } from "@/lib/pricing";

type CouponWithRelations = Coupon & {
  couponNotes: CouponNote[];
  couponPhysicalDocuments: CouponPhysicalDocument[];
};

export async function validateCouponForPhysicalCart(params: {
  code: string;
  userId: string;
  documentIds: string[];
  subtotal: number;
}): Promise<
  | { ok: true; coupon: CouponWithRelations; couponDiscount: number }
  | { ok: false; message: string }
> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: params.code.toUpperCase().trim() },
    include: { couponNotes: true, couponPhysicalDocuments: true },
  });

  if (!coupon) return { ok: false, message: "Invalid coupon code." };
  if (coupon.status !== "ACTIVE") return { ok: false, message: "This coupon is not active." };

  const now = new Date();
  if (now < coupon.validFrom) return { ok: false, message: "Coupon is not valid yet." };
  if (now > coupon.validUntil) return { ok: false, message: "Coupon has expired." };

  if (coupon.maxUsers != null && coupon.usedCount >= coupon.maxUsers) {
    return { ok: false, message: "Coupon usage limit reached." };
  }

  const minPurchase = parseFloat(coupon.minPurchaseAmount.toString());
  if (params.subtotal < minPurchase) {
    return {
      ok: false,
      message: `Minimum purchase amount is ₹${minPurchase.toFixed(2)}.`,
    };
  }

  if (coupon.couponPhysicalDocuments.length > 0) {
    const allowed = new Set(coupon.couponPhysicalDocuments.map((n) => n.physicalDocumentId));
    const allAllowed = params.documentIds.every((id) => allowed.has(id));
    if (!allAllowed) {
      return { ok: false, message: "Coupon does not apply to all items in your cart." };
    }
  } else if (coupon.couponNotes.length > 0) {
    const docs = await prisma.physicalDocument.findMany({
      where: { id: { in: params.documentIds } },
      select: { id: true, sourceNoteId: true },
    });
    const allowedNotes = new Set(coupon.couponNotes.map((n) => n.noteId));
    const allAllowed = docs.every(
      (d) => d.sourceNoteId != null && allowedNotes.has(d.sourceNoteId)
    );
    if (!allAllowed || docs.length !== params.documentIds.length) {
      return {
        ok: false,
        message:
          "Coupon does not apply to all items in your cart. Link physical products to notes or pick applicable physical documents in admin.",
      };
    }
  }

  const existing = await prisma.physicalCouponRedemption.findUnique({
    where: {
      userId_couponId: { userId: params.userId, couponId: coupon.id },
    },
  });
  if (existing) {
    return { ok: false, message: "You have already used this coupon." };
  }

  const couponDiscount = calculateCouponDiscount(
    params.subtotal,
    coupon.discountType as DiscountType,
    parseFloat(coupon.discountValue.toString()),
    coupon.maxDiscount ? parseFloat(coupon.maxDiscount.toString()) : null
  );

  return { ok: true, coupon, couponDiscount: roundMoney(couponDiscount) };
}
