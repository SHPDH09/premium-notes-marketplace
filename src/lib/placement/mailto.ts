/** RFC 6068 mailto — use %20 for spaces (not +), which mobile clients render correctly. */
export function buildMailtoUrl(to: string, subject: string, body: string) {
  const maxBody = 1800;
  const trimmedBody =
    body.length > maxBody
      ? `${body.slice(0, maxBody - 48).trim()}\n\n(Full details in attached resume.)`
      : body;

  const query = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(trimmedBody)}`,
  ].join("&");

  const address = to.trim();
  return `mailto:${address.includes(",") ? encodeURIComponent(address) : address}?${query}`;
}
