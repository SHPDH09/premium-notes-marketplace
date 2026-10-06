import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { createCashfreeRefund } from "@/lib/payment/cashfree";

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

export async function refundOrder(orderId: string): Promise<{ gatewayWarning?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, transaction: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "REFUNDED") throw new Error("Order is already refunded");
  if (order.paymentStatus !== "SUCCESS") {
    throw new Error("Only successful payments can be refunded");
  }

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
        amount: Number(order.totalAmount),
      });
    } catch (e) {
      gatewayWarning =
        e instanceof Error ? e.message : "Payment gateway refund failed; marked refunded in app only.";
    }
  }

  await prisma.$transaction(async (tx) => {
    const purchases = await tx.purchase.findMany({ where: { orderId } });
    for (const p of purchases) {
      await tx.note.update({
        where: { id: p.noteId },
        data: { purchaseCount: { decrement: 1 } },
      });
    }
    await tx.purchase.deleteMany({ where: { orderId } });

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "REFUNDED",
        transactionStatus: "REFUNDED",
      },
    });

    if (order.transaction) {
      await tx.transaction.update({
        where: { orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }
  });

  return { gatewayWarning };
}

export function generatePaymentOrderId(): string {
  return `ord_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}
