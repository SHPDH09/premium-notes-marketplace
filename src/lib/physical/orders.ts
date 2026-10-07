import { prisma } from "@/lib/db";
import { generatePaymentOrderId } from "@/lib/orders";
import { createCashfreeRefund } from "@/lib/payment/cashfree";
import { randomUUID } from "crypto";
import { decimalToNumber } from "@/lib/utils";
import { Prisma, PhysicalFulfillmentStatus } from "@prisma/client";
import { generatePhysicalOrderNumber } from "@/lib/physical/order-number";
import { getPhysicalCartSummary } from "@/lib/physical/cart-server";
import { validateCouponForPhysicalCart } from "@/lib/physical/coupon";
import { getShippingSettings, estimateExpectedDelivery } from "@/lib/physical/shipping";
import { canAdminAdvanceFulfillment } from "@/lib/physical/status-machine";
import { emitPhysicalNotification } from "@/lib/physical/notifications";
import { validateIndianPincode, validateIndianPhone, normalizePhone } from "@/lib/physical/validation";
import { createCashfreeOrder } from "@/lib/payment/cashfree";

export type DeliveryAddressInput = {
  fullName: string;
  phone: string;
  altPhone?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

function validateAddress(addr: DeliveryAddressInput) {
  if (!addr.fullName.trim()) throw new Error("Full name is required.");
  if (!validateIndianPhone(addr.phone)) throw new Error("Enter a valid 10-digit mobile number.");
  if (addr.altPhone && !validateIndianPhone(addr.altPhone)) {
    throw new Error("Enter a valid alternate phone number.");
  }
  if (!addr.addressLine1.trim()) throw new Error("Address is required.");
  if (!addr.city.trim() || !addr.state.trim()) throw new Error("City and state are required.");
  if (!validateIndianPincode(addr.pincode)) throw new Error("Enter a valid Indian pincode.");
}

export async function appendStatusHistory(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: string,
  note?: string,
  changedBy?: string
) {
  await tx.physicalOrderStatusHistory.create({
    data: { orderId, status, note, changedBy },
  });
}

export async function fulfillSuccessfulPhysicalOrder(
  orderId: string,
  transactionExternalId: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.physicalOrder.findUnique({
      where: { id: orderId },
      include: { redemption: true, items: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === "SUCCESS") return order;

    const settings = await getShippingSettings();
    const maxProcessing = Math.max(
      ...order.items.map((i) => i.pageCountSnap ?? 0),
      settings.processingDays
    );
    const expected = estimateExpectedDelivery(maxProcessing, settings.shippingDays);

    await tx.physicalOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "SUCCESS",
        paymentTxnId: transactionExternalId,
        fulfillmentStatus: "PAYMENT_CONFIRMED",
        expectedDelivery: expected,
      },
    });

    await appendStatusHistory(tx, orderId, "PAYMENT_CONFIRMED", "Payment verified");
    await tx.printingJob.upsert({
      where: { orderId },
      create: { orderId, status: "PENDING_PRINT" },
      update: {},
    });

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
      if (!order.redemption) {
        await tx.physicalCouponRedemption.create({
          data: {
            userId: order.userId,
            couponId: order.couponId,
            orderId: order.id,
          },
        });
      }
    }

    await tx.physicalCartItem.deleteMany({ where: { userId: order.userId } });
    await tx.physicalCartMeta.deleteMany({ where: { userId: order.userId } });

    emitPhysicalNotification("payment_success", {
      orderId,
      orderNumber: order.orderNumber,
    });

    return order;
  });
}

export async function createPhysicalCheckoutOrder(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  address: DeliveryAddressInput;
  addressId?: string;
  idempotencyKey?: string;
  appBaseUrl?: string;
  acceptedLegal?: boolean;
}) {
  if (!params.acceptedLegal) {
    throw new Error("You must accept the Terms and Privacy Policy to continue.");
  }

  validateAddress(params.address);

  if (params.idempotencyKey) {
    const existing = await prisma.physicalOrder.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return { physicalOrderId: existing.id, orderNumber: existing.orderNumber, existing: true as const };
    }
  }

  const cart = await getPhysicalCartSummary(params.userId);
  if (cart.items.length === 0) throw new Error("Your cart is empty.");

  let couponId = cart.couponId;
  if (cart.couponCode && !couponId) {
    const validation = await validateCouponForPhysicalCart({
      code: cart.couponCode,
      userId: params.userId,
      documentIds: cart.items.map((i) => i.physicalDocumentId),
      subtotal: cart.subtotal,
    });
    if (!validation.ok) throw new Error(validation.message);
    couponId = validation.coupon.id;
  }

  const orderNumber = await generatePhysicalOrderNumber();
  const cashfreeOrderId = generatePaymentOrderId();

  const order = await prisma.physicalOrder.create({
    data: {
      orderNumber,
      userId: params.userId,
      subtotal: cart.subtotal,
      couponDiscount: cart.couponDiscount,
      deliveryCharge: cart.deliveryCharge,
      totalAmount: cart.total,
      couponId,
      cashfreeOrderId,
      idempotencyKey: params.idempotencyKey ?? null,
      studentNameSnap: params.userName,
      studentEmailSnap: params.userEmail,
      studentPhoneSnap: params.userPhone ?? normalizePhone(params.address.phone),
      fulfillmentStatus: "ORDER_PLACED",
      items: {
        create: cart.items.map((item) => ({
          physicalDocumentId: item.physicalDocumentId,
          documentNameSnap: item.name,
          documentTitleSnap: item.title,
          quantity: item.quantity,
          pageCountSnap: item.pageCount,
          printType: item.printType,
          paperType: item.paperType,
          bindingType: item.bindingType,
          unitPrice: item.unitPrice,
          totalPrice: item.lineTotal,
        })),
      },
      address: {
        create: {
          fullName: params.address.fullName.trim(),
          phone: normalizePhone(params.address.phone),
          altPhone: params.address.altPhone ? normalizePhone(params.address.altPhone) : null,
          addressLine1: params.address.addressLine1.trim(),
          addressLine2: params.address.addressLine2?.trim() || null,
          landmark: params.address.landmark?.trim() || null,
          city: params.address.city.trim(),
          state: params.address.state.trim(),
          pincode: params.address.pincode.trim(),
          country: params.address.country?.trim() || "India",
        },
      },
    },
  });

  await prisma.physicalOrderStatusHistory.create({
    data: { orderId: order.id, status: "ORDER_PLACED" },
  });

  emitPhysicalNotification("order_placed", { orderId: order.id, orderNumber });

  const baseUrl =
    params.appBaseUrl?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  if (cart.total <= 0) {
    await fulfillSuccessfulPhysicalOrder(order.id, `free_${order.id}`);
    return { physicalOrderId: order.id, orderNumber, free: true as const };
  }

  const paymentConfigured = process.env.PAYMENT_API_KEY && process.env.PAYMENT_SECRET;
  if (!paymentConfigured && process.env.ALLOW_DEV_PAYMENT === "true") {
    await fulfillSuccessfulPhysicalOrder(order.id, `dev_${order.id}`);
    return { physicalOrderId: order.id, orderNumber, free: true as const, dev: true };
  }
  if (!paymentConfigured) throw new Error("Payment gateway is not configured.");

  const { paymentSessionId } = await createCashfreeOrder({
    orderId: cashfreeOrderId,
    amount: cart.total,
    customerId: params.userId,
    customerEmail: params.userEmail,
    customerPhone: params.userPhone ?? params.address.phone,
    customerName: params.userName,
    returnUrl: `${baseUrl}/physical-checkout/success?order_id=${order.id}`,
    notifyUrl: `${baseUrl}/api/payments/webhook`,
  });

  return {
    physicalOrderId: order.id,
    orderNumber,
    paymentSessionId,
    free: false as const,
  };
}

export async function updatePhysicalFulfillmentStatus(
  orderId: string,
  to: PhysicalFulfillmentStatus,
  adminId: string,
  note?: string
) {
  const order = await prisma.physicalOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (!canAdminAdvanceFulfillment(order.fulfillmentStatus, to)) {
    throw new Error(`Cannot change status from ${order.fulfillmentStatus} to ${to}`);
  }

  const data: Prisma.PhysicalOrderUpdateInput = { fulfillmentStatus: to };
  if (to === "DELIVERED") data.deliveredAt = new Date();
  if (to === "SHIPPED" && !order.shippingDate) data.shippingDate = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.physicalOrder.update({ where: { id: orderId }, data });
    await appendStatusHistory(tx, orderId, to, note, adminId);
  });

  emitPhysicalNotification(to.toLowerCase() as "delivered", { orderId, orderNumber: order.orderNumber });
}

export async function refundPhysicalOrder(
  orderId: string,
  amount: number,
  reason: string,
  adminId: string
) {
  const order = await prisma.physicalOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus !== "SUCCESS" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    throw new Error("Only paid orders can be refunded.");
  }
  const total = decimalToNumber(order.totalAmount);
  if (amount <= 0 || amount > total) throw new Error("Invalid refund amount.");

  let paymentRefundId: string | undefined;
  const skipGateway =
    !order.cashfreeOrderId ||
    (order.paymentTxnId?.startsWith("free_") ?? false) ||
    (order.paymentTxnId?.startsWith("dev_") ?? false);

  if (!skipGateway && order.cashfreeOrderId) {
    paymentRefundId = `pref_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    await createCashfreeRefund({
      orderId: order.cashfreeOrderId,
      refundId: paymentRefundId,
      amount,
      note: reason.slice(0, 200),
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.physicalOrderRefund.create({
      data: {
        orderId,
        refundAmount: amount,
        reason,
        status: "REFUNDED",
        paymentRefundId: paymentRefundId ?? null,
        approvedBy: adminId,
      },
    });
    await tx.physicalOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: amount >= total ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundStatus: "REFUNDED",
      },
    });
    await appendStatusHistory(tx, orderId, "REFUNDED", reason, adminId);
  });

  emitPhysicalNotification("refund_processed", { orderId, orderNumber: order.orderNumber });
}
