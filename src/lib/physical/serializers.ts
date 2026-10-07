import {
  Note,
  PhysicalDocument,
  PhysicalOrder,
  PhysicalOrderItem,
  PhysicalOrderAddress,
  PhysicalOrderStatusHistory,
  UserAddress,
  PrintingJob,
  Shipment,
} from "@prisma/client";
import { decimalToNumber } from "@/lib/utils";
import { getPublicCoverUrl } from "@/lib/storage";
import { fulfillmentLabel, printStatusLabel, shippingStatusLabel } from "@/lib/physical/status-machine";
import { serializeNotePublic } from "@/lib/serializers";

export function serializePhysicalDocumentPublic(
  doc: PhysicalDocument,
  sourceNote?: Note | null
) {
  const noteCover = sourceNote ? getPublicCoverUrl(sourceNote.coverImage) : null;
  const docCover = getPublicCoverUrl(doc.coverStorageKey);
  const coverImage = docCover ?? noteCover;

  const title = doc.title || sourceNote?.title || doc.name;
  const name = doc.name || sourceNote?.name || title;
  const description = doc.description || sourceNote?.description || "";

  const pageCount = doc.pageCount ?? sourceNote?.pdfPageCount ?? null;

  const digitalNote = sourceNote ? serializeNotePublic(sourceNote) : null;

  return {
    id: doc.id,
    name,
    title,
    description,
    coverImage,
    pageCount,
    paperSize: doc.paperSize,
    paperType: doc.paperType,
    printType: doc.printType,
    bindingType: doc.bindingType,
    finalPrice: decimalToNumber(doc.finalPrice),
    minQuantity: doc.minQuantity,
    maxQuantity: doc.maxQuantity,
    processingDays: doc.processingDays,
    status: doc.status,
    sourceNoteId: doc.sourceNoteId,
    purchaseCount: sourceNote?.purchaseCount ?? 0,
    /** Linked digital note card fields (same shape as browse notes). */
    linkedNote: digitalNote,
    noteDiscountPercentage: digitalNote?.discountPercentage ?? 0,
    compareDigitalPrice: digitalNote?.finalPrice ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializePhysicalDocumentAdmin(
  doc: PhysicalDocument,
  sourceNote?: Note | null
) {
  const publicFields = serializePhysicalDocumentPublic(doc, sourceNote);
  const printingCost = decimalToNumber(doc.printingCost);
  const pages = publicFields.pageCount ?? 0;
  return {
    ...publicFields,
    name: doc.name,
    description: doc.description,
    printingCost,
    bindingCost: decimalToNumber(doc.bindingCost),
    packagingCost: decimalToNumber(doc.packagingCost),
    basePrice: decimalToNumber(doc.basePrice),
    priceOverride: doc.priceOverride,
    coverStorageKey: doc.coverStorageKey,
    sourcePdfKey: doc.sourcePdfKey ? "[stored]" : null,
    sourceNotePageCount: sourceNote?.pdfPageCount ?? null,
    pricePerPage:
      pages > 0 ? Math.round((printingCost / pages) * 100) / 100 : null,
  };
}

type OrderWithRelations = PhysicalOrder & {
  items?: PhysicalOrderItem[];
  address?: PhysicalOrderAddress | null;
  history?: PhysicalOrderStatusHistory[];
  printingJob?: PrintingJob | null;
  shipment?: Shipment | null;
};

export function serializePhysicalOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    subtotal: decimalToNumber(order.subtotal),
    discountAmount: decimalToNumber(order.discountAmount),
    couponDiscount: decimalToNumber(order.couponDiscount),
    deliveryCharge: decimalToNumber(order.deliveryCharge),
    totalAmount: decimalToNumber(order.totalAmount),
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentLabel: fulfillmentLabel(order.fulfillmentStatus),
    printStatus: order.printStatus,
    printStatusLabel: printStatusLabel(order.printStatus),
    shippingStatus: order.shippingStatus,
    shippingStatusLabel: shippingStatusLabel(order.shippingStatus),
    refundStatus: order.refundStatus,
    expectedDelivery: order.expectedDelivery?.toISOString() ?? null,
    courierName: order.courierName,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    shippingDate: order.shippingDate?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    studentName: order.studentNameSnap,
    studentEmail: order.studentEmailSnap,
    studentPhone: order.studentPhoneSnap,
    createdAt: order.createdAt.toISOString(),
    items:
      order.items?.map((i) => ({
        id: i.id,
        documentName: i.documentNameSnap,
        documentTitle: i.documentTitleSnap,
        quantity: i.quantity,
        pageCount: i.pageCountSnap,
        printType: i.printType,
        paperType: i.paperType,
        bindingType: i.bindingType,
        unitPrice: decimalToNumber(i.unitPrice),
        totalPrice: decimalToNumber(i.totalPrice),
      })) ?? [],
    address: order.address
      ? {
          fullName: order.address.fullName,
          phone: order.address.phone,
          altPhone: order.address.altPhone,
          addressLine1: order.address.addressLine1,
          addressLine2: order.address.addressLine2,
          landmark: order.address.landmark,
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pincode,
          country: order.address.country,
        }
      : null,
    history:
      order.history?.map((h) => ({
        status: h.status,
        note: h.note,
        changedBy: h.changedBy,
        at: h.createdAt.toISOString(),
      })) ?? [],
    printingJob: order.printingJob
      ? {
          status: order.printingJob.status,
          priority: order.printingJob.priority,
          qcReason: order.printingJob.qcReason,
        }
      : null,
    shipment: order.shipment
      ? {
          courierName: order.shipment.courierName,
          trackingNumber: order.shipment.trackingNumber,
          trackingUrl: order.shipment.trackingUrl,
          expectedDeliveryDate: order.shipment.expectedDeliveryDate?.toISOString() ?? null,
          shippingStatus: order.shipment.shippingStatus,
        }
      : null,
  };
}

export function serializeUserAddress(a: UserAddress) {
  return {
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country,
    isDefault: a.isDefault,
  };
}
