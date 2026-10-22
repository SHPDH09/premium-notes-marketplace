/** Cashfree replaces `{order_id}` with the gateway order id on redirect. Keep our DB id in a separate query param. */
export function physicalCheckoutReturnUrl(baseUrl: string, physicalOrderId: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/physical-checkout/success?physical_order_id=${encodeURIComponent(
    physicalOrderId
  )}&order_id={order_id}`;
}

export function digitalCheckoutReturnUrl(baseUrl: string, orderId: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/checkout/success?app_order_id=${encodeURIComponent(orderId)}&order_id={order_id}`;
}

export function placementSubscribeReturnUrl(baseUrl: string, planOrderId: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/placement/subscribe/success?plan_order_id=${encodeURIComponent(
    planOrderId
  )}&order_id={order_id}`;
}

export function crmSubscriptionReturnUrl(baseUrl: string, subscriptionOrderId: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/crm/subscription-plans/success?crm_order_id=${encodeURIComponent(
    subscriptionOrderId
  )}&order_id={order_id}`;
}
