export function formatApiError(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const o = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    if (Array.isArray(o.formErrors) && o.formErrors[0]) return o.formErrors[0];
    if (o.fieldErrors) {
      for (const messages of Object.values(o.fieldErrors)) {
        if (Array.isArray(messages) && messages[0]) return messages[0];
      }
    }
  }
  return "Request failed";
}
