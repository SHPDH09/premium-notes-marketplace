import { decimalToNumber } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import {
  PLATFORM_REFUND_FEE_RATE,
  REFUND_WINDOW_HOURS,
} from "@/lib/legal/refund-policy-content";

export {
  REFUND_WINDOW_HOURS,
  PLATFORM_REFUND_FEE_RATE,
  PLATFORM_REFUND_FEE_PERCENT,
  refundPolicyShortText,
  refundPolicyPaymentBullet,
} from "@/lib/legal/refund-policy-content";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function orderPaymentTime(order: {
  createdAt: Date;
  transaction?: { createdAt: Date } | null;
}): Date {
  return order.transaction?.createdAt ?? order.createdAt;
}

export function refundWindowExpiresAt(paidAt: Date): Date {
  return new Date(paidAt.getTime() + REFUND_WINDOW_HOURS * 60 * 60 * 1000);
}

export function isWithinRefundWindow(paidAt: Date, now = new Date()): boolean {
  return now.getTime() <= refundWindowExpiresAt(paidAt).getTime();
}

export function maxNetRefundableTotal(orderTotal: number): number {
  return roundMoney(orderTotal * (1 - PLATFORM_REFUND_FEE_RATE));
}

export function maxNetRefundableRemaining(orderTotal: number, alreadyRefundedNet: number): number {
  return roundMoney(Math.max(0, maxNetRefundableTotal(orderTotal) - alreadyRefundedNet));
}

export function isOrderFullyRefundedByPolicy(orderTotal: number, alreadyRefundedNet: number): boolean {
  return alreadyRefundedNet >= maxNetRefundableTotal(orderTotal) - 0.001;
}

export function orderRefundableRemaining(
  totalAmount: Prisma.Decimal,
  refundedAmount: Prisma.Decimal
): number {
  const total = decimalToNumber(totalAmount);
  const refunded = decimalToNumber(refundedAmount);
  return maxNetRefundableRemaining(total, refunded);
}
