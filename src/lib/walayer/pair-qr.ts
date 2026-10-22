/** Extract a base64 or data-URL QR image from WALayer pair / SSE payloads. */
export function findQrImageInPayload(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  for (const key of ["qr", "qr_code", "qrcode", "image", "png", "base64"]) {
    const v = o[key];
    if (typeof v === "string" && v.length > 80) return v;
  }

  if (typeof o.type === "string" && o.type.toLowerCase().includes("qr")) {
    for (const v of Object.values(o)) {
      if (typeof v === "string" && v.length > 80) return v;
    }
  }

  for (const nested of ["data", "frame", "payload", "body"]) {
    if (nested in o) {
      const inner = findQrImageInPayload(o[nested]);
      if (inner) return inner;
    }
  }
  return null;
}

export function qrToDataUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  return `data:image/png;base64,${trimmed.replace(/^data:image\/\w+;base64,/, "")}`;
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
    return findQrImageInPayload(json);
  } catch {
    if (dataLine.length > 80 && /^[A-Za-z0-9+/=]+$/.test(dataLine)) return dataLine;
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
      const qr = parseQrFromSseEvent(ev);
      if (qr) {
        reader.cancel().catch(() => {});
        return qr;
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
