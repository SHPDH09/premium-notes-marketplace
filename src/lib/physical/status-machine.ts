import { PhysicalFulfillmentStatus, PhysicalPrintStatus, PhysicalShippingStatus } from "@prisma/client";

const FULFILLMENT_TRANSITIONS: Record<PhysicalFulfillmentStatus, PhysicalFulfillmentStatus[]> = {
  ORDER_PLACED: ["PAYMENT_CONFIRMED", "CANCELLED"],
  PAYMENT_CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PRINTING", "CANCELLED"],
  PRINTING: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["PACKED", "PRINTING", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransitionFulfillment(
  from: PhysicalFulfillmentStatus,
  to: PhysicalFulfillmentStatus
): boolean {
  if (from === to) return true;
  return FULFILLMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Admin may skip intermediate steps (e.g. jump to Shipped) but not go backwards in the timeline. */
export function canAdminAdvanceFulfillment(
  from: PhysicalFulfillmentStatus,
  to: PhysicalFulfillmentStatus
): boolean {
  if (from === to) return true;
  if (to === "CANCELLED" || to === "RETURNED") {
    return canTransitionFulfillment(from, to);
  }
  if (from === "CANCELLED" || from === "RETURNED") return false;

  const fromIdx = TIMELINE_STATUSES.indexOf(from);
  const toIdx = TIMELINE_STATUSES.indexOf(to);
  if (fromIdx >= 0 && toIdx >= 0) return toIdx >= fromIdx;

  return canTransitionFulfillment(from, to);
}

export const STUDENT_CANCELLABLE: PhysicalFulfillmentStatus[] = [
  "ORDER_PLACED",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
];

export function fulfillmentLabel(s: PhysicalFulfillmentStatus): string {
  const map: Record<PhysicalFulfillmentStatus, string> = {
    ORDER_PLACED: "Order Placed",
    PAYMENT_CONFIRMED: "Payment Confirmed",
    PROCESSING: "Processing",
    PRINTING: "Printing",
    QUALITY_CHECK: "Quality Check",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
  };
  return map[s];
}

export function printStatusLabel(s: PhysicalPrintStatus): string {
  const map: Record<PhysicalPrintStatus, string> = {
    PENDING_PRINT: "Pending Print",
    PRINTING: "Printing",
    PRINTED: "Printed",
    QC_PENDING: "QC Pending",
    QC_PASSED: "QC Passed",
    QC_FAILED: "QC Failed",
    REPRINT_REQUIRED: "Reprint Required",
  };
  return map[s];
}

export function shippingStatusLabel(s: PhysicalShippingStatus): string {
  const map: Record<PhysicalShippingStatus, string> = {
    NOT_SHIPPED: "Not Shipped",
    READY_FOR_PACKING: "Ready for Packing",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    DELIVERY_FAILED: "Delivery Failed",
    RETURNED: "Returned",
  };
  return map[s];
}

export const TIMELINE_STATUSES: PhysicalFulfillmentStatus[] = [
  "ORDER_PLACED",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "PRINTING",
  "QUALITY_CHECK",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
