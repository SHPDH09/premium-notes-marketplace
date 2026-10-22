/** Extract E.164-ish digits from WhatsApp JID (e.g. 9198...@s.whatsapp.net). */
export function phoneFromWaJid(jid: string): string | null {
  const local = jid.split("@")[0]?.replace(/\D/g, "");
  if (!local || local.length < 8) return null;
  return local.startsWith("+") ? local : `+${local}`;
}

export function chatJidFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}
