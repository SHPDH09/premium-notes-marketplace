import {
  deepFindQrMaterial,
  parseQrMaterialFromSseEvent,
  parseSseChunk,
  sseEventIndicatesConnected,
} from "@/lib/walayer/pair-qr-parse";
import { materialToDataUrl } from "@/lib/walayer/pair-qr";

export async function consumeCrmPairStream(
  accountId: string,
  signal: AbortSignal,
  handlers: {
    onQr: (dataUrl: string) => void;
    onConnected?: () => void;
    onError?: (message: string) => void;
  }
): Promise<void> {
  const res = await fetch(`/api/crm/connections/${accountId}/pair/stream`, {
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(
      text.trim() || "Could not open QR stream. Confirm WALayer API key in Super Admin → Settings."
    );
    return;
  }

  if (!res.body) {
    handlers.onError?.("Empty QR stream from server.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buffer);
    buffer = rest;

    for (const ev of events) {
      if (signal.aborted) return;
      if (sseEventIndicatesConnected(ev)) {
        handlers.onConnected?.();
        reader.cancel().catch(() => {});
        return;
      }
      const material = parseQrMaterialFromSseEvent(ev);
      if (material) {
        const dataUrl = await materialToDataUrl(material);
        handlers.onQr(dataUrl);
      } else {
        const fromJson = tryParseEventJson(ev);
        if (fromJson) {
          const nested = deepFindQrMaterial(fromJson);
          if (nested) {
            handlers.onQr(await materialToDataUrl(nested));
          }
        }
      }
    }
  }
}

function tryParseEventJson(block: string): unknown | null {
  for (const line of block.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const dataLine = line.slice(5).trim();
    if (!dataLine || dataLine === "[DONE]") return null;
    try {
      return JSON.parse(dataLine) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}
