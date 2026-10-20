import { PhysicalDocument } from "@prisma/client";
import { decimalToNumber } from "@/lib/utils";
import { roundMoney } from "@/lib/pricing";

export function computePhysicalDocumentFinalPrice(doc: PhysicalDocument): number {
  if (doc.priceOverride) {
    return roundMoney(decimalToNumber(doc.finalPrice));
  }
  const sum =
    decimalToNumber(doc.printingCost) +
    decimalToNumber(doc.bindingCost) +
    decimalToNumber(doc.packagingCost) +
    decimalToNumber(doc.basePrice);
  return roundMoney(sum);
}

export function clampQuantity(doc: PhysicalDocument, quantity: number): number {
  const q = Math.floor(quantity);
  return Math.min(doc.maxQuantity, Math.max(doc.minQuantity, q));
}
