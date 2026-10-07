import { prisma } from "@/lib/db";
import { getCartSummary } from "@/lib/cart-server";
import { validateCouponForCart } from "@/lib/coupon";
import { roundMoney } from "@/lib/pricing";
import { digitalCheckoutReturnUrl } from "@/lib/payment/return-url";
import { generatePaymentOrderId } from "@/lib/orders";
import { createCashfreeOrder } from "@/lib/payment/cashfree";

export async function createCheckoutOrder(
  userId: string,
  userEmail: string,
  userPhone?: string,
  appBaseUrl?: string,
  customerName?: string
) {
  const cart = await getCartSummary(userId);
  if (cart.items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  for (const item of cart.items) {
    const existing = await prisma.purchase.findUnique({
      where: { userId_noteId: { userId, noteId: item.noteId } },
    });
    if (existing) throw new Error(`You already own "${item.title}".`);
  }

  let couponId: string | undefined;
  if (cart.couponCode) {
    const validation = await validateCouponForCart({
      code: cart.couponCode,
      userId,
      noteIds: cart.items.map((i) => i.noteId),
      subtotal: cart.merchandiseTotal,
    });
    if (!validation.ok) throw new Error(validation.message);
    couponId = validation.coupon.id;
  }

  const cashfreeOrderId = generatePaymentOrderId();

  const order = await prisma.order.create({
    data: {
      userId,
      subtotal: cart.subtotal,
      discount: cart.noteDiscount,
      couponDiscount: cart.couponDiscount,
      totalAmount: cart.total,
      couponId,
      cashfreeOrderId,
      items: {
        create: cart.items.map((item) => {
          const note = { price: item.price, finalPrice: item.finalPrice };
          return {
            noteId: item.noteId,
            price: note.price,
            discount: roundMoney(note.price - note.finalPrice),
            finalPrice: note.finalPrice,
          };
        }),
      },
    },
    include: { items: true },
  });

  const baseUrl =
    appBaseUrl?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  if (cart.total <= 0) {
    const { fulfillSuccessfulOrder } = await import("@/lib/orders");
    await fulfillSuccessfulOrder(order.id, `free_${order.id}`);
    return { orderId: order.id, free: true as const };
  }

  const paymentConfigured =
    process.env.PAYMENT_API_KEY && process.env.PAYMENT_SECRET;

  if (!paymentConfigured && process.env.ALLOW_DEV_PAYMENT === "true") {
    const { fulfillSuccessfulOrder } = await import("@/lib/orders");
    await fulfillSuccessfulOrder(order.id, `dev_${order.id}`);
    return { orderId: order.id, free: true as const, dev: true };
  }

  if (!paymentConfigured) {
    throw new Error("Payment gateway is not configured.");
  }

  const { paymentSessionId } = await createCashfreeOrder({
    orderId: cashfreeOrderId,
    amount: cart.total,
    customerId: userId,
    customerEmail: userEmail,
    customerPhone: userPhone,
    customerName,
    returnUrl: digitalCheckoutReturnUrl(baseUrl, order.id),
    notifyUrl: `${baseUrl}/api/payments/webhook`,
  });

  return { orderId: order.id, paymentSessionId, free: false as const };
}
