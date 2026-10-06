const REFUND_PREFIX = "[Refund]";

export function formatRefundAdminNote(reason: string, existingAdminNote?: string | null): string {
  const line = `${REFUND_PREFIX} ${reason.trim()}`;
  if (existingAdminNote?.trim()) {
    return `${existingAdminNote.trim()}\n${line}`;
  }
  return line;
}

/** Read refund reason from dedicated field or legacy admin_note lines. */
export function resolveRefundReason(
  refundReason: string | null | undefined,
  adminNote: string | null | undefined
): string | null {
  if (refundReason?.trim()) return refundReason.trim();
  if (!adminNote) return null;
  for (const line of adminNote.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(REFUND_PREFIX)) {
      const text = trimmed.slice(REFUND_PREFIX.length).trim();
      return text || trimmed;
    }
  }
  return null;
}
