/** Sync helpers shared by server routes and the CRM connections UI. */

export type QrMaterial = { kind: "image" | "code"; value: string };

export function looksLikeQrImage(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("data:image")) return true;
  if (v.length >= 80 && /^[A-Za-z0-9+/=\s]+$/.test(v)) return true;
  return false;
}

/** Baileys / WhatsApp Web linking payload (not a PNG). */
export function isWhatsAppLinkQrString(value: string): boolean {
  const v = value.trim();
  if (v.length < 15 || v.length > 4096) return false;
  if (v.startsWith("data:image")) return false;
  if (looksLikeQrImage(v)) return false;
  if (/^2[@,]/.test(v)) return true;
  if (v.includes(",") && /^[\x21-\x7E]+$/.test(v) && v.length >= 30) return true;
  return false;
}

export function looksLikePairingCode(value: string): boolean {
  const v = value.trim();
  if (isWhatsAppLinkQrString(v)) return true;
  if (v.length < 8 || v.length > 4096) return false;
  if (v.startsWith("data:image")) return false;
  if (looksLikeQrImage(v)) return false;
  return true;
}

export function deepFindQrMaterial(obj: unknown, depth = 0): QrMaterial | null {
  if (depth > 10) return null;

  if (typeof obj === "string") {
    const t = obj.trim();
    if (looksLikeQrImage(t)) return { kind: "image", value: t };
    if (isWhatsAppLinkQrString(t) || looksLikePairingCode(t)) return { kind: "code", value: t };
    return null;
  }

  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepFindQrMaterial(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const o = obj as Record<string, unknown>;
  const priorityKeys = [
    "qr",
    "code",
    "qr_code",
    "qrcode",
    "pairing_code",
    "pairingCode",
    "token",
    "image",
    "png",
    "base64",
    "data_url",
    "dataUrl",
  ];

  for (const key of priorityKeys) {
    const v = o[key];
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (key === "qr" || key === "code" || key.includes("qr") || key.includes("pair")) {
      if (looksLikeQrImage(t)) return { kind: "image", value: t };
      if (isWhatsAppLinkQrString(t) || looksLikePairingCode(t)) return { kind: "code", value: t };
    } else if (looksLikeQrImage(t)) {
      return { kind: "image", value: t };
    }
  }

  for (const nested of ["data", "frame", "payload", "body", "result", "event"]) {
    if (nested in o) {
      const inner = deepFindQrMaterial(o[nested], depth + 1);
      if (inner) return inner;
    }
  }

  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const inner = deepFindQrMaterial(v, depth + 1);
      if (inner) return inner;
    }
  }

  return null;
}

export function parseSseChunk(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { events: parts, rest };
}

export function parseQrMaterialFromSseEvent(block: string): QrMaterial | null {
  if (block.startsWith(":")) return null;

  const lines = block.split("\n");
  let dataLine = "";
  let eventName = "";
  for (const line of lines) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim().toLowerCase();
    if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }

  if (!dataLine) return null;
  if (dataLine === "[DONE]" || dataLine === "ping") return null;

  const qrishEvent =
    eventName.includes("qr") ||
    eventName.includes("pair") ||
    eventName === "frame" ||
    eventName === "message";

  try {
    const json = JSON.parse(dataLine) as unknown;
    const fromJson = deepFindQrMaterial(json);
    if (fromJson) return fromJson;
    if (qrishEvent) {
      const asString = deepFindQrMaterial({ type: eventName, data: json });
      if (asString) return asString;
    }
  } catch {
    if (looksLikeQrImage(dataLine)) return { kind: "image", value: dataLine };
    if (isWhatsAppLinkQrString(dataLine) || looksLikePairingCode(dataLine)) {
      return { kind: "code", value: dataLine.trim() };
    }
  }

  return null;
}

export function sseEventIndicatesConnected(block: string): boolean {
  const lower = block.toLowerCase();
  if (lower.includes("session.paired") || lower.includes('"paired"')) return true;
  if (lower.includes('"connected"') && !lower.includes("not_connected")) return true;
  if (lower.includes("pair_success") || lower.includes("pairsuccess")) return true;
  return false;
}
