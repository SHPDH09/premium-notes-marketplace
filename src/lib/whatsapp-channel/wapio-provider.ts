/**
 * Wapio (and compatible providers): REST publish to WhatsApp Channel newsletter JID.
 * Not Meta Cloud API — uses a connected WhatsApp session (third-party).
 * @see https://www.wapio.io/docs/endpoints/send-message
 */

export async function wapioTestConnection(apiBaseUrl: string, apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = apiBaseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/sessions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key or unauthorized" };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function wapioSendChannelMessage(params: {
  apiBaseUrl: string;
  apiKey: string;
  channelId: string;
  text: string;
  idempotencyKey: string;
}): Promise<{ ok: true; raw: unknown } | { ok: false; error: string }> {
  const base = params.apiBaseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        channel_id: params.channelId,
        text: params.text,
      }),
      cache: "no-store",
    });
    const raw = await res.json().catch(async () => ({ body: await res.text() }));
    if (!res.ok) {
      const msg =
        typeof raw === "object" && raw && "message" in raw
          ? String((raw as { message: unknown }).message)
          : typeof raw === "object" && raw && "error" in raw
            ? String((raw as { error: unknown }).error)
            : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
