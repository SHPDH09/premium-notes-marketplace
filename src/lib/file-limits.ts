export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Vercel serverless request body limit (~4.5MB). Files larger must upload directly to storage. */
export const VERCEL_SAFE_INLINE_BYTES = 4 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Cover must be an image file.";
  if (file.size > MAX_IMAGE_BYTES) return "Cover image must be under 5MB.";
  return null;
}

export function validatePdfFile(file: File): string | null {
  if (file.type !== "application/pdf") return "Notes file must be a PDF.";
  if (file.size > MAX_PDF_BYTES) return "PDF must be under 25MB.";
  return null;
}

export function validatePresignRequest(
  folder: "covers" | "pdfs",
  contentType: string,
  size: number
): string | null {
  if (folder === "covers") {
    if (!contentType.startsWith("image/")) return "Invalid image type.";
    if (size > MAX_IMAGE_BYTES) return "Cover image must be under 5MB.";
  } else {
    if (contentType !== "application/pdf") return "Invalid PDF type.";
    if (size > MAX_PDF_BYTES) return "PDF must be under 25MB.";
  }
  if (size <= 0) return "Empty file.";
  return null;
}

export function isAllowedStorageKey(key: string | null | undefined, folder: "covers" | "pdfs"): boolean {
  if (!key) return false;
  if (!key.startsWith(`${folder}/`)) return false;
  if (key.includes("..")) return false;
  return /^[a-zA-Z0-9/._-]+$/.test(key);
}
