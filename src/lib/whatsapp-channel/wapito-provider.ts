/**
 * Wapito — publish to WhatsApp Channel via POST /v1/messages/text with @newsletter recipient.
 * @see https://wapito.com/docs/api/messages/send-text/
 * @see https://wapito.com/whatsapp-api/post-to-channel/
 */

export const WAPITO_DEFAULT_API_BASE = "https://api.wapito.com/v1";

function normalizeBase(apiBaseUrl: string): string {
  return (apiBaseUrl || WAPITO_DEFAULT_API_BASE).replace(/\/$/, "");
}

function parseWapitoError(raw: unknown, status: number): string {
  if (raw && typeof raw === "object" && "error" in raw) {
    const err = (raw as { error?: { message?: string; code?: string } }).error;
    if (err?.message) return err.code ? `${err.code}: ${err.message}` : err.message;
  }
  if (typeof raw === "object" && raw && "message" in raw) {
    return String((raw as { message: unknown }).message);
  }
  return `HTTP ${status}`;
}

export async function wapitoTestConnection(
  apiKey: string,
  apiBaseUrl?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = normalizeBase(apiBaseUrl ?? WAPITO_DEFAULT_API_BASE);
  try {
    const res = await fetch(`${base}/newsletters?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid Wapito token or unauthorized" };
    }
    if (!res.ok) {
      const raw = await res.json().catch(async () => ({ message: await res.text() }));
      return { ok: false, error: parseWapitoError(raw, res.status) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function wapitoSendChannelMessage(params: {
  apiKey: string;
  channelId: string;
  text: string;
  apiBaseUrl?: string;
}): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const base = normalizeBase(params.apiBaseUrl ?? WAPITO_DEFAULT_API_BASE);
  const to = params.channelId.trim();
  if (!to.includes("@newsletter")) {
    return {
      ok: false,
      error: 'Channel ID must be a newsletter JID (e.g. 120363…@newsletter)',
    };
  }

  try {
    const res = await fetch(`${base}/messages/text`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        body: params.text,
      }),
      cache: "no-store",
    });
    const raw = await res.json().catch(async () => ({ message: await res.text() }));
    if (!res.ok) {
      return { ok: false, error: parseWapitoError(raw, res.status) };
    }
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
