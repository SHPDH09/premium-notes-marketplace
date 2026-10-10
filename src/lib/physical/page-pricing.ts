import { roundMoney } from "@/lib/pricing";

export function printingCostFromPerPage(pageCount: number, pricePerPage: number): number {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 0;
  if (!Number.isFinite(pricePerPage) || pricePerPage < 0) return 0;
  return roundMoney(pageCount * pricePerPage);
}

export function pricePerPageFromPrintingCost(pageCount: number, printingCost: number): number {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 0;
  if (!Number.isFinite(printingCost) || printingCost < 0) return 0;
  return roundMoney(printingCost / pageCount);
}

export function computeFinalPhysicalPrice(parts: {
  printingCost: number;
  bindingCost: number;
  packagingCost: number;
  basePrice: number;
}): number {
  return roundMoney(
    parts.printingCost + parts.bindingCost + parts.packagingCost + parts.basePrice
  );
}
