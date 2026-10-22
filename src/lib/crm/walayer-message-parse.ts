/** Parse WALayer webhook / chat-history message payloads into CRM fields. */

export function parseWalayerMessagePayload(row: Record<string, unknown>) {
  const type = String(row.type ?? row.message_type ?? "text").toLowerCase();
  const providerMessageId =
    (typeof row.message_id === "string" && row.message_id.trim()) ||
    (typeof row.id === "string" && row.id.startsWith("msg_") ? row.id : "") ||
    null;
  const waMessageId =
    typeof row.wa_message_id === "string" && row.wa_message_id.trim()
      ? row.wa_message_id.trim()
      : null;

  let text = typeof row.text === "string" ? row.text : "";
  const body = row.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    if (typeof b.text === "string" && b.text) text = text || b.text;
    if (typeof b.caption === "string" && b.caption) text = text || b.caption;
  }
  if (typeof row.caption === "string" && row.caption) text = text || row.caption;

  let mediaId: string | null = null;
  if (typeof row.media_id === "string" && row.media_id) mediaId = row.media_id;
  else if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.id === "string" && b.id) mediaId = b.id;
    else if (typeof b.media_id === "string" && b.media_id) mediaId = b.media_id;
  }

  const mediaUrl = mediaId ? `walayer:${mediaId}` : null;
  const fromMe = row.from_me === true;

  return {
    type,
    text: text.trim(),
    providerMessageId,
    waMessageId,
    mediaUrl,
    fromMe,
  };
}

export function messageDisplayFallback(type: string, text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (t) return t;
  const labels: Record<string, string> = {
    text: "Text message",
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
