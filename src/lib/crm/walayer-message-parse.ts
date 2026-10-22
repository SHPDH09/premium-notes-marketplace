/** Parse WALayer webhook / chat-history message payloads into CRM fields. */

const TEXT_KEYS = ["text", "caption", "conversation", "title", "description", "content"] as const;

const NESTED_KEYS = ["body", "message", "content", "payload", "data", "raw"] as const;

const WA_PROTO_KEYS = [
  "extendedTextMessage",
  "conversation",
  "imageMessage",
  "videoMessage",
  "documentMessage",
  "audioMessage",
  "stickerMessage",
  "buttonsResponseMessage",
  "listResponseMessage",
] as const;

export function extractWalayerTextDeep(value: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : "";
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const o = value as Record<string, unknown>;

  for (const key of TEXT_KEYS) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  for (const key of WA_PROTO_KEYS) {
    if (o[key]) {
      const found = extractWalayerTextDeep(o[key], depth + 1);
      if (found) return found;
    }
  }

  for (const key of NESTED_KEYS) {
    if (o[key]) {
      const found = extractWalayerTextDeep(o[key], depth + 1);
      if (found) return found;
    }
  }

  return "";
}

export function walayerRowTimestamp(row: Record<string, unknown>): number | null {
  if (typeof row.at === "number") return row.at * 1000;
  if (typeof row.sent_at === "number") return row.sent_at * 1000;
  if (typeof row.timestamp === "number") {
    return row.timestamp > 1e12 ? row.timestamp : row.timestamp * 1000;
  }
  if (typeof row.created_at === "number") {
    return row.created_at > 1e12 ? row.created_at : row.created_at * 1000;
  }
  return null;
}

export function parseWalayerMessagePayload(row: Record<string, unknown>) {
  const type = String(row.type ?? row.message_type ?? "text").toLowerCase();

  const providerMessageId =
    (typeof row.message_id === "string" && row.message_id.trim()) ||
    (typeof row.id === "string" && row.id.trim() ? row.id.trim() : "") ||
    null;

  const waMessageId =
    typeof row.wa_message_id === "string" && row.wa_message_id.trim()
      ? row.wa_message_id.trim()
      : typeof row.wa_id === "string" && row.wa_id.trim()
        ? row.wa_id.trim()
        : null;

  const text = extractWalayerTextDeep(row);

  let mediaId: string | null = null;
  if (typeof row.media_id === "string" && row.media_id) mediaId = row.media_id;
  const body = row.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    if (typeof b.id === "string" && b.id) mediaId = b.id;
    else if (typeof b.media_id === "string" && b.media_id) mediaId = b.media_id;
  }

  const mediaUrl = mediaId ? `walayer:${mediaId}` : null;
  const fromMe = row.from_me === true || row.direction === "outbound";

  return {
    type,
    text,
    providerMessageId,
    waMessageId,
    mediaUrl,
    fromMe,
    timestampMs: walayerRowTimestamp(row),
  };
}

export function messageDisplayFallback(type: string, text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (t) return t;
  const labels: Record<string, string> = {
    text: "Message (text unavailable — enable WALayer content storage or wait for sync)",
    image: "Image",
    video: "Video",
    audio: "Voice message",
    document: "Document",
    sticker: "Sticker",
    location: "Location",
    contact: "Contact card",
  };
  return labels[type] ?? `[${type}]`;
}
