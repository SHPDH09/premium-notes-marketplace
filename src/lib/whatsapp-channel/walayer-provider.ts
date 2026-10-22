/**
 * WALayer — post to WhatsApp Channel via session-scoped REST API.
 * @see https://walayer.com/docs
 */

export const WALAYER_DEFAULT_API_BASE = "https://api.walayer.com/v1";

function normalizeBase(apiBaseUrl: string): string {
  const raw = (apiBaseUrl || WALAYER_DEFAULT_API_BASE).replace(/\/$/, "");
  if (raw.endsWith("/v1")) return raw;
  return `${raw}/v1`;
}

function apiPath(base: string, segments: string): string {
  return `${normalizeBase(base)}${segments.startsWith("/") ? segments : `/${segments}`}`;
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}

function parseWalayerError(raw: unknown, status: number): string {
  if (raw && typeof raw === "object" && "error" in raw) {
    const err = (raw as { error?: { message?: string; code?: string } }).error;
    if (err?.message) return err.code ? `${err.code}: ${err.message}` : err.message;
  }
  if (typeof raw === "object" && raw && "message" in raw) {
    return String((raw as { message: unknown }).message);
  }
  return `HTTP ${status}`;
}

export async function walayerTestConnection(
  apiKey: string,
  sessionId: string,
  apiBaseUrl?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = sessionId.trim();
  if (!sid) {
    return { ok: false, error: "Session ID is required" };
  }
  try {
    const res = await fetch(apiPath(apiBaseUrl ?? WALAYER_DEFAULT_API_BASE, `/sessions/${enc(sid)}/health`), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid WALayer API key or unauthorized" };
    }
    if (res.status === 404) {
      return { ok: false, error: "Session not found — check Session ID in WALayer dashboard" };
    }
    if (!res.ok) {
      const raw = await res.json().catch(async () => ({ message: await res.text() }));
      return { ok: false, error: parseWalayerError(raw, res.status) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function walayerSendChannelMessage(params: {
  apiKey: string;
  sessionId: string;
  channelId: string;
  text: string;
  idempotencyKey: string;
  apiBaseUrl?: string;
}): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const channelId = params.channelId.trim();
  const sessionId = params.sessionId.trim();
  if (!sessionId) {
    return { ok: false, error: "WALayer session ID is not configured" };
  }
  if (!channelId.includes("@newsletter")) {
    return {
      ok: false,
      error: 'Channel ID must be a newsletter JID (e.g. 120363…@newsletter)',
    };
  }

  try {
    const res = await fetch(
      apiPath(
        params.apiBaseUrl ?? WALAYER_DEFAULT_API_BASE,
        `/sessions/${enc(sessionId)}/channels/${enc(channelId)}/messages`
      ),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": params.idempotencyKey,
        },
        body: JSON.stringify({
          type: "text",
          body: { text: params.text },
        }),
        cache: "no-store",
      }
    );
    const raw = await res.json().catch(async () => ({ message: await res.text() }));
    if (!res.ok) {
      return { ok: false, error: parseWalayerError(raw, res.status) };
    }
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
