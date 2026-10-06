import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { createCashfreeRefund } from "@/lib/payment/cashfree";
import { formatRefundAdminNote } from "@/lib/refund-reason";
import {
  isOrderFullyRefundedByPolicy,
  isWithinRefundWindow,
  maxNetRefundableRemaining,
  orderPaymentTime,
  PLATFORM_REFUND_FEE_PERCENT,
  REFUND_WINDOW_HOURS,
} from "@/lib/refund-policy";
import { decimalToNumber } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function fulfillSuccessfulOrder(orderId: string, transactionExternalId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, redemption: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === "SUCCESS") return order;

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "SUCCESS",
        transactionStatus: "SUCCESS",
      },
    });

    await tx.transaction.upsert({
      where: { orderId },
      create: {
        orderId,
        userId: order.userId,
        transactionId: transactionExternalId,
        amount: order.totalAmount,
        paymentStatus: "SUCCESS",
      },
      update: {
        paymentStatus: "SUCCESS",
        transactionId: transactionExternalId,
      },
    });

    for (const item of order.items) {
      await tx.purchase.upsert({
        where: {
          userId_noteId: { userId: order.userId, noteId: item.noteId },
        },
        create: {
          userId: order.userId,
          noteId: item.noteId,
          orderId: order.id,
          purchasedPrice: item.finalPrice,
        },
        update: {},
      });
      await tx.note.update({
        where: { id: item.noteId },
        data: { purchaseCount: { increment: 1 } },
      });
    }

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
      if (!order.redemption) {
        await tx.couponRedemption.create({
          data: {
            userId: order.userId,
            couponId: order.couponId,
            orderId: order.id,
          },
        });
      }
    }

    await tx.cartItem.deleteMany({ where: { userId: order.userId } });

    return order;
  });
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type RefundOrderOptions = {
  /** Omit to refund all remaining balance. */
  amount?: number;
  reason: string;
};

export async function refundOrder(
  orderId: string,
  options: RefundOrderOptions
): Promise<{ gatewayWarning?: string; refundedAmount: number; fullyRefunded: boolean }> {
  const reason = options.reason.trim();
  if (!reason) throw new Error("Refund reason is required");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, transaction: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "REFUNDED") throw new Error("Order is already fully refunded");
  if (order.paymentStatus !== "SUCCESS" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    throw new Error("Only successful payments can be refunded");
  }

  const paidAt = orderPaymentTime(order);
  if (!isWithinRefundWindow(paidAt)) {
    throw new Error(
      `Refunds are not available more than ${REFUND_WINDOW_HOURS} hours after payment`
    );
  }

  const total = roundMoney(decimalToNumber(order.totalAmount));
  const alreadyRefunded = roundMoney(decimalToNumber(order.refundedAmount));
  const remainingNet = maxNetRefundableRemaining(total, alreadyRefunded);
  if (remainingNet <= 0) {
    throw new Error(
      `No refundable balance remaining (${PLATFORM_REFUND_FEE_PERCENT}% platform charge applies to all refunds)`
    );
  }

  let refundAmount = options.amount != null ? roundMoney(options.amount) : remainingNet;
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error("Refund amount must be greater than zero");
  }
  if (refundAmount > remainingNet + 0.001) {
    throw new Error(
      `Refund amount cannot exceed ${remainingNet.toFixed(2)} (max after ${PLATFORM_REFUND_FEE_PERCENT}% platform fee)`
    );
  }
  if (refundAmount > remainingNet) refundAmount = remainingNet;

  const fullyRefunded = isOrderFullyRefundedByPolicy(total, roundMoney(alreadyRefunded + refundAmount));

  let gatewayWarning: string | undefined;
  const externalTxnId = order.transaction?.transactionId ?? "";
  const skipGateway =
    externalTxnId.startsWith("free_") ||
    externalTxnId.startsWith("dev_") ||
    !order.cashfreeOrderId;

  if (!skipGateway && order.cashfreeOrderId) {
    try {
      await createCashfreeRefund({
        orderId: order.cashfreeOrderId,
        refundId: `ref_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        amount: refundAmount,
        note: reason.slice(0, 200),
      });
    } catch (e) {
      gatewayWarning =
        e instanceof Error ? e.message : "Payment gateway refund failed; recorded in app only.";
    }
  }

  const newRefundedTotal = roundMoney(alreadyRefunded + refundAmount);
  const nextPaymentStatus = fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";

  await prisma.$transaction(async (tx) => {
    await tx.orderRefund.create({
      data: {
        orderId,
        amount: new Prisma.Decimal(refundAmount),
        reason,
      },
    });

    if (fullyRefunded) {
      const purchases = await tx.purchase.findMany({ where: { orderId } });
      for (const p of purchases) {
        await tx.note.update({
          where: { id: p.noteId },
          data: { purchaseCount: { decrement: 1 } },
        });
      }
      await tx.purchase.deleteMany({ where: { orderId } });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: new Prisma.Decimal(newRefundedTotal),
        refundReason: reason,
        adminNote: formatRefundAdminNote(reason, order.adminNote, refundAmount),
        paymentStatus: nextPaymentStatus,
        transactionStatus: nextPaymentStatus,
      },
    });

    if (order.transaction) {
      await tx.transaction.update({
        where: { orderId },
        data: { paymentStatus: nextPaymentStatus },
      });
    }
  });

  return { gatewayWarning, refundedAmount: refundAmount, fullyRefunded };
}

export function generatePaymentOrderId(): string {
  return `ord_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export { orderRefundableRemaining } from "@/lib/refund-policy";
