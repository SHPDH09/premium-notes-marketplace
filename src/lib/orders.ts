import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

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

export function generatePaymentOrderId(): string {
  return `ord_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}
