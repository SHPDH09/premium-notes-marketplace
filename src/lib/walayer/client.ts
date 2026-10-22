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
}): Promise<{ ok: true; data: T; raw: unknown } | { ok: false; error: string; status: number }> {
  const base = normalizeWalayerBase(params.apiBaseUrl ?? WALAYER_DEFAULT_API_BASE);
  const path = params.path.startsWith("/") ? params.path : `/${params.path}`;
  try {
    const res = await fetch(`${base}${path}`, {
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

export async function walayerCreateSession(apiKey: string, apiBaseUrl: string | undefined, label: string) {
  return walayerRequest<{ id: string }>({
    apiKey,
    apiBaseUrl,
    path: "/sessions",
    method: "POST",
    body: { label },
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
