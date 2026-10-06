export const REFUND_WINDOW_HOURS = 12;
export const PLATFORM_REFUND_FEE_RATE = 0.2;
export const PLATFORM_REFUND_FEE_PERCENT = Math.round(PLATFORM_REFUND_FEE_RATE * 100);

export const LEGAL_LAST_UPDATED = "6 October 2025";

/** Plain-language refund rules (EN) for legal pages and checkout. */
export const refundPolicyParagraphs = {
  headline: `${REFUND_WINDOW_HOURS}-hour refund window · ${PLATFORM_REFUND_FEE_PERCENT}% platform fee`,
  withinWindow: `If you raise a complaint or refund request within ${REFUND_WINDOW_HOURS} hours of a successful payment, we may approve a refund after verification. ${PLATFORM_REFUND_FEE_PERCENT}% of the order value is retained as a platform fee; the remaining amount is refunded to your original payment method.`,
  afterWindow: `After ${REFUND_WINDOW_HOURS} hours from successful payment, no refund will be provided for digital notes. All sales are final once this period has passed.`,
  howToRequest: `Email support with your registered email, transaction ID, and reason for the complaint. Refunds are processed through our payment gateway after admin approval.`,
  partialRefunds:
    "Partial refunds may be issued at our discretion within the 12-hour window, subject to the same platform fee rules. Full refund under policy may revoke access to purchased notes.",
} as const;

export function refundPolicyShortText(): string {
  return `Complaints within ${REFUND_WINDOW_HOURS} hours of payment may qualify for a refund after a ${PLATFORM_REFUND_FEE_PERCENT}% platform fee. After ${REFUND_WINDOW_HOURS} hours, no refund.`;
}

export function refundPolicyPaymentBullet(): string {
  return `Refunds only if you complain within ${REFUND_WINDOW_HOURS} hours of payment (${PLATFORM_REFUND_FEE_PERCENT}% platform fee deducted). After ${REFUND_WINDOW_HOURS} hours — no refund. See Terms & Privacy.`;
}
