/** Canonical site URL for NextAuth cookies/CSRF — must match the domain users visit. */
export function resolveNextAuthUrl(): string | undefined {
  const explicit = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const brand = process.env.NEXT_PUBLIC_BRAND_WEBSITE?.trim().replace(/\/$/, "");
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
