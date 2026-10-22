/** Extract E.164-ish digits from WhatsApp JID (e.g. 9198...@s.whatsapp.net). */
export function phoneFromWaJid(jid: string): string | null {
  const local = jid.split("@")[0]?.replace(/\D/g, "");
  if (!local || local.length < 8) return null;
  return formatDisplayPhone(local);
}

export function chatJidFromPhone(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return `${digits}@s.whatsapp.net`;
}

/** Digits only, no plus — used for uniqueness and matching. */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Human-facing E.164 with leading + when possible. */
export function formatDisplayPhone(digits: string): string {
  const d = normalizePhoneDigits(digits);
  if (!d) return "";
  return d.startsWith("+") ? d : `+${d}`;
}

export function normalizePhoneInput(phone: string): { digits: string; display: string; valid: boolean } {
  const digits = normalizePhoneDigits(phone);
  const valid = digits.length >= 10 && digits.length <= 15;
  return { digits, display: formatDisplayPhone(digits), valid };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
