import { DiscountType } from "@prisma/client";

export function calculateFinalPrice(
  price: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (discountValue <= 0) return roundMoney(price);
  let final: number;
  if (discountType === "PERCENTAGE") {
    final = price - (price * Math.min(discountValue, 100)) / 100;
  } else {
    final = price - discountValue;
  }
  return roundMoney(Math.max(0, final));
}

export function calculateCouponDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
  maxDiscount?: number | null
): number {
  let discount: number;
  if (discountType === "PERCENTAGE") {
    discount = (subtotal * discountValue) / 100;
  } else {
    discount = discountValue;
  }
  if (maxDiscount != null) {
    discount = Math.min(discount, maxDiscount);
  }
  return roundMoney(Math.min(discount, subtotal));
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function discountPercent(price: number, finalPrice: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - finalPrice) / price) * 100);
}
