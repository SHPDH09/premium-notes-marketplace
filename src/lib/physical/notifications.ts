/** Fire-and-forget notification hooks; email/SMS can be wired later. */
export type PhysicalNotificationEvent =
  | "order_placed"
  | "payment_success"
  | "printing_started"
  | "printing_completed"
  | "order_packed"
  | "order_shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refund_processed";

export function emitPhysicalNotification(
  _event: PhysicalNotificationEvent,
  _payload: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[physical-notification]", _event, _payload.orderNumber ?? _payload.orderId);
  }
}
