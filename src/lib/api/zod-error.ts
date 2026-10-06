import { ZodError } from "zod";

export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid input";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
