import {
  deepFindQrMaterial,
  parseQrMaterialFromSseEvent,
  parseSseChunk,
  sseEventIndicatesConnected,
  type QrMaterial,
} from "@/lib/walayer/pair-qr-parse";

export {
  deepFindQrMaterial,
  looksLikeQrImage,
  looksLikePairingCode,
  parseQrMaterialFromSseEvent,
  parseSseChunk,
  sseEventIndicatesConnected,
} from "@/lib/walayer/pair-qr-parse";

/** @deprecated use deepFindQrMaterial */
export function findQrImageInPayload(obj: unknown): string | null {
  const m = deepFindQrMaterial(obj);
  return m?.kind === "image" ? m.value : null;
}

/** @deprecated use deepFindQrMaterial */
export function findQrPairingCode(obj: unknown): string | null {
  const m = deepFindQrMaterial(obj);
  return m?.kind === "code" ? m.value : null;
}

export function qrToDataUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  return `data:image/png;base64,${trimmed.replace(/^data:image\/\w+;base64,/, "")}`;
}

export async function materialToDataUrl(material: QrMaterial): Promise<string> {
  if (material.kind === "image") return qrToDataUrl(material.value);
  return pairingCodeToDataUrl(material.value);
}

export async function qrPayloadToDataUrl(obj: unknown): Promise<string | null> {
  const material = deepFindQrMaterial(obj);
  if (!material) return null;
  return materialToDataUrl(material);
}

export async function pairingCodeToDataUrl(code: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(code, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}

export async function watchQrEventStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onQr: (dataUrl: string) => void | Promise<void>;
    onConnected?: () => void | Promise<void>;
  },
  timeoutMs = 120000
): Promise<void> {
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
      if (sseEventIndicatesConnected(ev)) {
        await handlers.onConnected?.();
        reader.cancel().catch(() => {});
        return;
      }
      const material = parseQrMaterialFromSseEvent(ev);
      if (material) {
        const dataUrl = await materialToDataUrl(material);
        await handlers.onQr(dataUrl);
      }
    }
  }
  reader.cancel().catch(() => {});
}

export async function readQrFromEventStream(
  body: ReadableStream<Uint8Array>,
  timeoutMs = 25000
): Promise<string | null> {
  let last: string | null = null;
  await watchQrEventStream(
    body,
    {
      onQr: (dataUrl) => {
        last = dataUrl;
      },
    },
    timeoutMs
  );
  return last;
}
