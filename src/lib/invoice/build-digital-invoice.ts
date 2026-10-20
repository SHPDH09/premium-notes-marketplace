import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import type { InvoiceDocumentData } from "@/lib/invoice/types";
import { digitalInvoiceNumber } from "@/lib/invoice/invoice-number";

export async function buildDigitalInvoiceForUser(
  orderId: string,
  userId: string
): Promise<InvoiceDocumentData | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      user: true,
      coupon: true,
      items: { include: { note: true } },
      transaction: true,
    },
  });
  if (!order) return null;

  const createdAt = order.createdAt.toISOString();
  const subtotal = decimalToNumber(order.subtotal);
  const discount = decimalToNumber(order.discount);
  const couponDiscount = decimalToNumber(order.couponDiscount);

  return {
    kind: "digital",
    invoiceNumber: digitalInvoiceNumber(order.id, createdAt),
    orderId: order.id,
    orderReference: order.transaction?.transactionId ?? order.cashfreeOrderId ?? order.id,
    issuedAt: createdAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.transaction?.paymentMethod ?? "Cashfree",
    paymentReference: order.transaction?.transactionId ?? order.cashfreeOrderId ?? null,
    gatewayOrderId: order.cashfreeOrderId ?? null,
    billTo: {
      name: order.user.name ?? "Student",
      email: order.user.email,
      phone: order.user.phone,
    },
    shipTo: null,
    lineItems: order.items.map((i) => ({
      id: i.id,
      description: i.note.title,
      subtitle: "Digital study note — lifetime access on your account",
      quantity: 1,
      unitPrice: decimalToNumber(i.finalPrice),
      lineTotal: decimalToNumber(i.finalPrice),
    })),
    subtotal,
    discount,
    couponCode: order.coupon?.code ?? null,
    couponDiscount,
    deliveryCharge: 0,
    totalAmount: decimalToNumber(order.totalAmount),
    refundedAmount: decimalToNumber(order.refundedAmount),
    currency: "INR",
    notes:
      "This is a computer-generated tax invoice / payment receipt for digital goods. Access is provided via your TechLaunchpad account after successful payment.",
  };
}
