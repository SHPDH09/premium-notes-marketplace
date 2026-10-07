import { PhysicalOrder, PhysicalOrderRefund, PhysicalOrderStatusHistory } from "@prisma/client";
import { decimalToNumber } from "@/lib/utils";
import {
  isWithinRefundWindow,
  maxNetRefundableRemaining,
  refundWindowExpiresAt,
  REFUND_WINDOW_HOURS,
  PLATFORM_REFUND_FEE_PERCENT,
} from "@/lib/refund-policy";

export function physicalOrderPaidAt(
  order: PhysicalOrder,
  history?: PhysicalOrderStatusHistory[]
): Date {
  const paid = history?.find((h) => h.status === "PAYMENT_CONFIRMED");
  return paid?.createdAt ?? order.createdAt;
}

export function physicalRefundSummary(
  order: PhysicalOrder,
  refunds: PhysicalOrderRefund[],
  history?: PhysicalOrderStatusHistory[]
) {
  const total = decimalToNumber(order.totalAmount);
  const refundedAmount = roundSum(refunds.map((r) => decimalToNumber(r.refundAmount)));
  const paidAt = physicalOrderPaidAt(order, history);
  const refundWindowOpen = isWithinRefundWindow(paidAt);
  const refundableRemaining = maxNetRefundableRemaining(total, refundedAmount);
  const canRefund =
    refundWindowOpen &&
    refundableRemaining > 0 &&
    (order.paymentStatus === "SUCCESS" || order.paymentStatus === "PARTIALLY_REFUNDED");

  return {
    refundedAmount,
    refundableRemaining,
    refundWindowOpen,
    refundDeadline: refundWindowExpiresAt(paidAt).toISOString(),
    canRefund,
    platformFeePercent: PLATFORM_REFUND_FEE_PERCENT,
    refundWindowHours: REFUND_WINDOW_HOURS,
  };
}

function roundSum(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
}
