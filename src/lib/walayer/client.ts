/**
 * Server-side WALayer REST client (Bearer wsk_live_…).
 * @see https://walayer.com/docs
 */

export const WALAYER_DEFAULT_API_BASE = "https://api.walayer.com/v1";

export function normalizeWalayerBase(apiBaseUrl: string): string {
  const raw = (apiBaseUrl || WALAYER_DEFAULT_API_BASE).replace(/\/$/, "");
  if (raw.endsWith("/v1")) return raw;
  return `${raw}/v1`;
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}

export function parseWalayerError(raw: unknown, status: number): string {
  if (raw && typeof raw === "object" && "error" in raw) {
    const err = (raw as { error?: { message?: string; code?: string } }).error;
    if (err?.message) return err.code ? `${err.code}: ${err.message}` : err.message;
  }
  if (typeof raw === "object" && raw && "message" in raw) {
    return String((raw as { message: unknown }).message);
  }
  return `HTTP ${status}`;
}

export async function walayerRequest<T = unknown>(params: {
  apiKey: string;
  apiBaseUrl?: string;
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
}): Promise<{ ok: true; data: T; raw: unknown } | { ok: false; error: string; status: number }> {
  const base = normalizeWalayerBase(params.apiBaseUrl ?? WALAYER_DEFAULT_API_BASE);
  const path = params.path.startsWith("/") ? params.path : `/${params.path}`;
  const qs = params.query
    ? `?${new URLSearchParams(
        Object.entries(params.query)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    : "";
  try {
    const res = await fetch(`${base}${path}${qs}`, {
      method: params.method ?? (params.body !== undefined ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        Accept: "application/json",
        ...(params.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(params.headers ?? {}),
      },
      body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    const raw = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return { ok: false, error: parseWalayerError(raw, res.status), status: res.status };
    }
    const data = (raw as { data?: T }).data !== undefined ? (raw as { data: T }).data : (raw as T);
    return { ok: true, data, raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error", status: 0 };
  }
}

/** WALayer requires ISO 3166-1 alpha-2 `country` when creating a session. */
export async function walayerCreateSession(
  apiKey: string,
  apiBaseUrl: string | undefined,
  input: { label: string; country: string }
) {
  return walayerRequest<{ id: string }>({
    apiKey,
    apiBaseUrl,
    path: "/sessions",
    method: "POST",
    body: { label: input.label, country: input.country.toUpperCase() },
  });
}

export async function walayerGetSession(apiKey: string, apiBaseUrl: string | undefined, sessionId: string) {
  return walayerRequest({
    apiKey,
    apiBaseUrl,
    path: `/sessions/${enc(sessionId)}`,
  });
}

export async function walayerSessionHealth(apiKey: string, apiBaseUrl: string | undefined, sessionId: string) {
  return walayerRequest({
    apiKey,
    apiBaseUrl,
    path: `/sessions/${enc(sessionId)}/health`,
  });
}

export async function walayerStartPair(apiKey: string, apiBaseUrl: string | undefined, sessionId: string) {
  return walayerRequest({
    apiKey,
    apiBaseUrl,
    path: `/sessions/${enc(sessionId)}/pair`,
    method: "POST",
    body: { method: "qr" },
  });
}

export async function walayerLogoutSession(apiKey: string, apiBaseUrl: string | undefined, sessionId: string) {
  return walayerRequest({
    apiKey,
    apiBaseUrl,
    path: `/sessions/${enc(sessionId)}/logout`,
    method: "POST",
  });
}

export async function walayerListChatMessages(params: {
  apiKey: string;
  apiBaseUrl?: string;
  sessionId: string;
  chatJid: string;
  limit?: number;
}) {
  return walayerRequest<unknown[] | { data?: unknown[] }>({
    apiKey: params.apiKey,
    apiBaseUrl: params.apiBaseUrl,
    path: `/sessions/${enc(params.sessionId)}/chats/${enc(params.chatJid)}/messages`,
    query: { limit: params.limit ?? 80 },
  });
}

export async function walayerGetPlatformMessage(
  apiKey: string,
  apiBaseUrl: string | undefined,
  messageId: string
) {
  return walayerRequest<Record<string, unknown>>({
    apiKey,
    apiBaseUrl,
    path: `/messages/${enc(messageId)}`,
  });
}

export async function walayerUploadMediaBase64(params: {
  apiKey: string;
  apiBaseUrl?: string;
  base64: string;
  mimeType: string;
  filename?: string;
}) {
  const first = await walayerRequest<{ id: string }>({
    apiKey: params.apiKey,
    apiBaseUrl: params.apiBaseUrl,
    path: "/media",
    method: "POST",
    body: {
      base64: params.base64,
      mime_type: params.mimeType,
      mime: params.mimeType,
      filename: params.filename,
    },
  });
  if (first.ok) return first;
  return walayerRequest<{ id: string }>({
    apiKey: params.apiKey,
    apiBaseUrl: params.apiBaseUrl,
    path: "/media",
    method: "POST",
    body: {
      data: params.base64,
      content_type: params.mimeType,
      filename: params.filename,
    },
  });
}

export async function walayerGetMediaReadUrl(
  apiKey: string,
  apiBaseUrl: string | undefined,
  mediaId: string
) {
  return walayerRequest<{ url?: string; read_url?: string }>({
    apiKey,
    apiBaseUrl,
    path: `/media/${enc(mediaId)}`,
  });
}

export async function walayerSendTypedMessage(params: {
  apiKey: string;
  apiBaseUrl?: string;
  sessionId: string;
  to: string;
  type: string;
  body: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return walayerRequest({
    apiKey: params.apiKey,
    apiBaseUrl: params.apiBaseUrl,
    path: `/sessions/${enc(params.sessionId)}/messages`,
    method: "POST",
    headers: { "Idempotency-Key": params.idempotencyKey },
    body: {
      type: params.type,
      to: params.to,
      body: params.body,
    },
  });
}

export async function walayerSendTextMessage(params: {
  apiKey: string;
  apiBaseUrl?: string;
  sessionId: string;
  to: string;
  text: string;
  idempotencyKey: string;
}) {
  return walayerRequest({
    apiKey: params.apiKey,
    apiBaseUrl: params.apiBaseUrl,
    path: `/sessions/${enc(params.sessionId)}/messages`,
    method: "POST",
    headers: { "Idempotency-Key": params.idempotencyKey },
    body: {
      type: "text",
      to: params.to,
      body: { text: params.text },
    },
  });
}

export async function walayerRejectCall(
  apiKey: string,
  apiBaseUrl: string | undefined,
  sessionId: string,
  callId: string
) {
  return walayerRequest({
    apiKey,
    apiBaseUrl,
    path: `/sessions/${enc(sessionId)}/calls/${enc(callId)}/reject`,
    method: "POST",
  });
}

export function walayerPairStreamUrl(apiBaseUrl: string | undefined, sessionId: string): string {
  const base = normalizeWalayerBase(apiBaseUrl ?? WALAYER_DEFAULT_API_BASE);
  return `${base}/sessions/${enc(sessionId)}/pair/stream?method=qr`;
}
