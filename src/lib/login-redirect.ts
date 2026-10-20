export function studentDashboardPath(callbackUrl: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!callbackUrl || !callbackUrl.startsWith("/")) return fallback;
  if (callbackUrl.startsWith("//")) return fallback;
  if (callbackUrl.startsWith("/admin")) return fallback;
  if (callbackUrl === "/login" || callbackUrl === "/register") return fallback;
  return callbackUrl;
}
