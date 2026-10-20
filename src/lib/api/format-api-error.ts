type ZodFlatten = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
};

export function formatZodFlatten(flatten: ZodFlatten): string {
  const parts: string[] = [...flatten.formErrors];
  for (const [field, messages] of Object.entries(flatten.fieldErrors)) {
    if (messages?.length) {
      parts.push(`${field}: ${messages.join(", ")}`);
    }
  }
  return parts.join(" · ") || "Please check the form and try again.";
}

/** Safe string for toast/UI from API `{ error: unknown }`. */
export function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "Something went wrong";
  if ("message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  if ("formErrors" in error && "fieldErrors" in error) {
    return formatZodFlatten(error as ZodFlatten);
  }
  return "Something went wrong";
}
