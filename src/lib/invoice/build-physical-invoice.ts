import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import type { InvoiceDocumentData } from "@/lib/invoice/types";
import { physicalInvoiceNumber } from "@/lib/invoice/invoice-number";
import { physicalRefundSummary } from "@/lib/physical/refund";

export async function buildPhysicalInvoiceForUser(
  orderId: string,
  userId: string
): Promise<InvoiceDocumentData | null> {
  const order = await prisma.physicalOrder.findFirst({
    where: { id: orderId, userId },
    include: {
      items: true,
      address: true,
      refunds: true,
      coupon: { select: { code: true } },
    },
  });
  if (!order) return null;

  const refundMeta = physicalRefundSummary(order, order.refunds ?? [], []);
  const createdAt = order.createdAt.toISOString();

  return {
    kind: "physical",
    invoiceNumber: physicalInvoiceNumber(order.orderNumber),
    orderId: order.id,
    orderReference: order.orderNumber,
    issuedAt: createdAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: "Cashfree",
    paymentReference: order.paymentTxnId ?? order.cashfreeOrderId ?? null,
    gatewayOrderId: order.cashfreeOrderId ?? null,
    billTo: {
      name: order.studentNameSnap,
      email: order.studentEmailSnap,
      phone: order.studentPhoneSnap,
    },
    shipTo: order.address
      ? {
          fullName: order.address.fullName,
          phone: order.address.phone,
          addressLine1: order.address.addressLine1,
          addressLine2: order.address.addressLine2,
          landmark: order.address.landmark,
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pincode,
          country: order.address.country,
        }
      : null,
    lineItems: order.items.map((i) => ({
      id: i.id,
      description: i.documentTitleSnap || i.documentNameSnap,
      subtitle: [
        i.printType?.replace(/_/g, " "),
        i.paperType?.replace(/_/g, " "),
        i.bindingType?.replace(/_/g, " "),
        i.pageCountSnap ? `${i.pageCountSnap} pages` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      quantity: i.quantity,
      unitPrice: decimalToNumber(i.unitPrice),
      lineTotal: decimalToNumber(i.totalPrice),
    })),
    subtotal: decimalToNumber(order.subtotal),
    discount: decimalToNumber(order.discountAmount),
    couponCode: order.coupon?.code ?? null,
    couponDiscount: decimalToNumber(order.couponDiscount),
    deliveryCharge: decimalToNumber(order.deliveryCharge),
    totalAmount: decimalToNumber(order.totalAmount),
    refundedAmount: refundMeta.refundedAmount,
    currency: "INR",
    notes:
      "This is a computer-generated tax invoice / payment receipt for printed physical documents. Shipment updates appear in your order timeline.",
  };
}
