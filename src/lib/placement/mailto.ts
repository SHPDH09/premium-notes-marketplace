export function buildMailtoUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}
