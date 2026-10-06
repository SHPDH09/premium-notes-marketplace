export async function readJsonResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response
): Promise<T & { error?: string }> {
  const text = await res.text();
  if (!text) {
    return { error: res.ok ? undefined : `Request failed (${res.status})` } as T & { error?: string };
  }
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 200) || `Request failed (${res.status})` } as T & { error?: string };
  }
}
