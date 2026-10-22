import type { CrmBillingInterval, CrmSubscriptionPlan } from "@prisma/client";

export function planPriceForCycle(
  plan: Pick<
    CrmSubscriptionPlan,
    | "priceInr"
    | "priceQuarterlyInr"
    | "priceHalfYearlyInr"
    | "priceYearlyInr"
    | "setupFeeInr"
    | "discountPercent"
  >,
  cycle: CrmBillingInterval
): number {
  let base = plan.priceInr;
  if (cycle === "QUARTERLY" && plan.priceQuarterlyInr != null) base = plan.priceQuarterlyInr;
  if (cycle === "HALF_YEARLY" && plan.priceHalfYearlyInr != null) base = plan.priceHalfYearlyInr;
  if (cycle === "YEARLY" && plan.priceYearlyInr != null) base = plan.priceYearlyInr;

  const discount = Math.max(0, Math.min(100, plan.discountPercent ?? 0));
  const discounted = Math.round(base * (1 - discount / 100));
  return Math.max(0, discounted + (plan.setupFeeInr ?? 0));
}

export function subscriptionPeriodEnd(from: Date, cycle: CrmBillingInterval): Date {
  const d = new Date(from);
  if (cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else if (cycle === "HALF_YEARLY") d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}
