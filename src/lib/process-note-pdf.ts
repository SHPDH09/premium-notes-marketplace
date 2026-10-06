import { uploadFile } from "@/lib/storage";

/** Upload full PDF only; preview is generated lazily on first public preview request. */
export async function processNotePdfUpload(
  pdfBuffer: Buffer
): Promise<{ fullKey: string } | { error: string }> {
  const fullUploaded = await uploadFile(pdfBuffer, "application/pdf", "pdfs");
  if (fullUploaded.error || !fullUploaded.key) {
    return { error: fullUploaded.error ?? "PDF upload failed. Check storage settings." };
  }
  return { fullKey: fullUploaded.key };
}
