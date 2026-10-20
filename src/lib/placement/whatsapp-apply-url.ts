/** Digits-only WhatsApp ID (country code + number, no +). */
export function normalizeWhatsAppPhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus || digits.length > 10) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsAppApplyUrl(phone: string, message: string): string {
  const id = normalizeWhatsAppPhone(phone);
  if (!id) return "";
  return `https://wa.me/${id}?text=${encodeURIComponent(message)}`;
}

export function buildTelUrl(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  return `tel:${trimmed.replace(/[^\d+]/g, "") || trimmed}`;
}
