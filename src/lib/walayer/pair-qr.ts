/** Extract a base64 PNG or data-URL from WALayer pair / SSE payloads. */
export function findQrImageInPayload(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  for (const key of [
    "qr",
    "qr_code",
    "qrcode",
    "qr_image",
    "qr_png",
    "image",
    "png",
    "base64",
    "data_url",
    "dataUrl",
  ]) {
    const v = o[key];
    if (typeof v === "string" && looksLikeQrImage(v)) return v;
  }

  const eventType = String(o.type ?? o.event ?? o.kind ?? "").toLowerCase();
  if (eventType.includes("qr") && !eventType.includes("request")) {
    for (const v of Object.values(o)) {
      if (typeof v === "string" && looksLikeQrImage(v)) return v;
    }
  }

  for (const nested of ["data", "frame", "payload", "body", "result"]) {
    if (nested in o) {
      const inner = findQrImageInPayload(o[nested]);
      if (inner) return inner;
    }
  }
  return null;
}

/** WhatsApp pairing token (scan string), not a rendered PNG. */
export function findQrPairingCode(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  for (const key of ["code", "pairing_code", "pairingCode", "token"]) {
    const v = o[key];
    if (typeof v === "string" && looksLikePairingCode(v)) return v.trim();
  }

  const eventType = String(o.type ?? o.event ?? "").toLowerCase();
  if (eventType === "qr" || eventType.includes("qr_") || eventType.includes("qr.")) {
    for (const key of ["code", "value", "text"]) {
      const v = o[key];
      if (typeof v === "string" && looksLikePairingCode(v)) return v.trim();
    }
  }

  for (const nested of ["data", "frame", "payload", "body", "result"]) {
    if (nested in o) {
      const inner = findQrPairingCode(o[nested]);
      if (inner) return inner;
    }
  }
  return null;
}

function looksLikeQrImage(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("data:image")) return true;
  if (v.length >= 80 && /^[A-Za-z0-9+/=\s]+$/.test(v)) return true;
  return false;
}

function looksLikePairingCode(value: string): boolean {
  const v = value.trim();
  if (v.length < 8 || v.length > 4096) return false;
  if (v.startsWith("data:image")) return false;
  if (looksLikeQrImage(v)) return false;
  return true;
}

export function qrToDataUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  return `data:image/png;base64,${trimmed.replace(/^data:image\/\w+;base64,/, "")}`;
}

/** Render WALayer QR token or pass through an image payload as a data URL. */
export async function qrPayloadToDataUrl(obj: unknown): Promise<string | null> {
  const image = findQrImageInPayload(obj);
  if (image) return qrToDataUrl(image);

  const code = findQrPairingCode(obj);
  if (!code) return null;

  return pairingCodeToDataUrl(code);
}

export async function pairingCodeToDataUrl(code: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(code, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}

/** SSE / pair stream may return a PNG blob or a WhatsApp scan string. */
export async function sseQrRawToDataUrl(raw: string): Promise<string | null> {
  const trimmed = raw.trim();
  if (looksLikeQrImage(trimmed)) return qrToDataUrl(trimmed);
  if (looksLikePairingCode(trimmed)) return pairingCodeToDataUrl(trimmed);
  return null;
}

export function parseSseChunk(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { events: parts, rest };
}

export function parseQrFromSseEvent(block: string): string | null {
  const lines = block.split("\n");
  let dataLine = "";
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLine += line.slice(5).trim();
    }
  }
  if (!dataLine) return null;
  if (dataLine === "[DONE]" || dataLine === "ping") return null;
  try {
    const json = JSON.parse(dataLine) as unknown;
    const image = findQrImageInPayload(json);
    if (image) return image;
    return findQrPairingCode(json);
  } catch {
    if (dataLine.length > 80 && /^[A-Za-z0-9+/=]+$/.test(dataLine)) return dataLine;
    if (looksLikePairingCode(dataLine)) return dataLine.trim();
    return null;
  }
}

export async function readQrFromEventStream(
  body: ReadableStream<Uint8Array>,
  timeoutMs = 25000
): Promise<string | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buffer);
    buffer = rest;
    for (const ev of events) {
      const qrRaw = parseQrFromSseEvent(ev);
      if (qrRaw) {
        reader.cancel().catch(() => {});
        return sseQrRawToDataUrl(qrRaw);
      }
      if (ev.includes("connected") || ev.includes("paired")) {
        reader.cancel().catch(() => {});
        return null;
      }
    }
  }
  reader.cancel().catch(() => {});
  return null;
}
