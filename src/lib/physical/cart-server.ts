import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { roundMoney } from "@/lib/pricing";
import { validateCouponForPhysicalCart } from "@/lib/physical/coupon";
import { calculateDeliveryCharge } from "@/lib/physical/shipping";
import { computePhysicalDocumentFinalPrice } from "@/lib/physical/pricing";
import { getPublicCoverUrl } from "@/lib/storage";

export async function getPhysicalCartSummary(userId: string) {
  const items = await prisma.physicalCartItem.findMany({
    where: { userId },
    include: { physicalDocument: true },
    orderBy: { createdAt: "desc" },
  });

  const validItems = items.filter((i) => i.physicalDocument.status === "ACTIVE");

  let subtotal = 0;
  const lineItems = validItems.map((item) => {
    const doc = item.physicalDocument;
    const unitPrice = decimalToNumber(item.unitPrice);
    const lineTotal = roundMoney(unitPrice * item.quantity);
    subtotal += lineTotal;
    return {
      id: item.id,
      physicalDocumentId: item.physicalDocumentId,
      name: doc.name,
      title: doc.title,
      coverImage: getPublicCoverUrl(doc.coverStorageKey),
      quantity: item.quantity,
      printType: item.printType,
      paperType: item.paperType,
      bindingType: item.bindingType,
      unitPrice,
      lineTotal,
      pageCount: doc.pageCount,
    };
  });

  subtotal = roundMoney(subtotal);

  const meta = await prisma.physicalCartMeta.findUnique({ where: { userId } });
  let couponCode: string | null = meta?.couponCode ?? null;
  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponId: string | undefined;

  if (couponCode && lineItems.length > 0) {
    const validation = await validateCouponForPhysicalCart({
      code: couponCode,
      userId,
      documentIds: lineItems.map((l) => l.physicalDocumentId),
      subtotal,
    });
    if (validation.ok) {
      couponDiscount = validation.couponDiscount;
      couponId = validation.coupon.id;
    } else {
      couponError = validation.message;
      couponCode = null;
      await prisma.physicalCartMeta.upsert({
        where: { userId },
        create: { userId, couponCode: null },
        update: { couponCode: null },
      });
    }
  }

  const afterCoupon = roundMoney(Math.max(0, subtotal - couponDiscount));
  const deliveryCharge = await calculateDeliveryCharge(afterCoupon);
  const total = roundMoney(afterCoupon + deliveryCharge);

  return {
    items: lineItems,
    subtotal,
    couponCode,
    couponDiscount,
    couponError,
    couponId,
    deliveryCharge,
    total,
  };
}

export async function resolveUnitPriceForCartLine(
  physicalDocumentId: string,
  printType: string,
  paperType: string,
  bindingType: string
) {
  const doc = await prisma.physicalDocument.findUnique({ where: { id: physicalDocumentId } });
  if (!doc || doc.status !== "ACTIVE") throw new Error("This document is currently unavailable.");
  // Options must match document defaults for v1; price from catalog final price
  void printType;
  void paperType;
  void bindingType;
  return computePhysicalDocumentFinalPrice(doc);
}
