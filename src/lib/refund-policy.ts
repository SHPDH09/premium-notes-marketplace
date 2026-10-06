import { decimalToNumber } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const REFUND_WINDOW_HOURS = 12;
export const PLATFORM_REFUND_FEE_RATE = 0.2;
export const PLATFORM_REFUND_FEE_PERCENT = Math.round(PLATFORM_REFUND_FEE_RATE * 100);

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

export function refundPolicyShortText(): string {
  return `Refunds are available only within ${REFUND_WINDOW_HOURS} hours of payment. A ${PLATFORM_REFUND_FEE_PERCENT}% platform charge is deducted; the balance is refunded to you.`;
}

export function refundPolicyPaymentBullet(): string {
  return `Refunds within ${REFUND_WINDOW_HOURS} hours only (${PLATFORM_REFUND_FEE_PERCENT}% platform fee on approved refunds — see Privacy Policy)`;
}
