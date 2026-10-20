function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isVercelPreviewHost(url: string): boolean {
  const h = hostname(url);
  return !!h && (h.endsWith(".vercel.app") || h === "vercel.app");
}

/** Canonical site URL for NextAuth cookies/CSRF — must match the domain users visit. */
export function resolveNextAuthUrl(): string | undefined {
  const brand = process.env.NEXT_PUBLIC_BRAND_WEBSITE?.trim().replace(/\/$/, "");
  const explicit = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");

  // Common misconfig: NEXTAUTH_URL still points at *.vercel.app while users open custom domain.
  if (explicit && brand && isVercelPreviewHost(explicit) && !isVercelPreviewHost(brand)) {
    return brand;
  }

  if (explicit) return explicit;

  if (brand) return brand;

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (app && !app.includes(".vercel.app")) return app;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return app || undefined;
}

export function ensureNextAuthUrlEnv() {
  const url = resolveNextAuthUrl();
  if (url) {
    process.env.NEXTAUTH_URL = url;
  }
}

/** Align NextAuth CSRF/cookies with the host the browser actually used (www vs apex). */
export function syncNextAuthUrlWithRequest(req: Request) {
  const forwarded = req.headers.get("x-forwarded-host");
  const hostHeader = req.headers.get("host");
  const host = (forwarded?.split(",")[0]?.trim() || hostHeader?.split(",")[0]?.trim() || "")
    .replace(/\/$/, "");

  if (!host) {
    ensureNextAuthUrlEnv();
    return;
  }

  const protoRaw = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    protoRaw === "http" || (host.startsWith("localhost") && !protoRaw)
      ? "http"
      : "https";

  process.env.NEXTAUTH_URL = `${proto}://${host}`.replace(/\/$/, "");
}
