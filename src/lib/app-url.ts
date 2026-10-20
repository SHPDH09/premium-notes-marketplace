import type { NextRequest } from "next/server";

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function isPreviewDeploymentHost(host: string): boolean {
  return host.includes("localhost") || host.endsWith(".vercel.app");
}

/** Public site origin for payment return/webhook URLs (must match Cashfree domain whitelist). */
export function resolveAppBaseUrl(req?: Pick<NextRequest, "headers"> | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const envHost = fromEnv ? hostFromOrigin(fromEnv) : null;

  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    if (host && !host.includes("localhost")) {
      const fromRequest = `${proto}://${host}`.replace(/\/$/, "");
      if (isPreviewDeploymentHost(host) && fromEnv && envHost && !isPreviewDeploymentHost(envHost)) {
        return fromEnv;
      }
      if (!isPreviewDeploymentHost(host)) return fromRequest;
    }
  }
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3000";
}
