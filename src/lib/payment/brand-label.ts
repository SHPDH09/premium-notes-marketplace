/** Label sent to Cashfree on orders (checkout / receipt metadata). */
export function getPaymentBrandLabel(): string {
  return (
    process.env.PAYMENT_MERCHANT_LABEL?.trim() ||
    process.env.NEXT_PUBLIC_BRAND_NAME?.trim() ||
    "TechLaunchpad"
  );
}
