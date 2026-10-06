import { extractPreviewPdf } from "@/lib/pdf-preview";
import { uploadFile, deleteStoredFile } from "@/lib/storage";

export async function processNotePdfUpload(
  pdfBuffer: Buffer,
  freePreviewPages: number,
  oldPreviewKey?: string | null
): Promise<{ fullKey: string; previewKey: string | null; pageCount: number } | { error: string }> {
  const fullUploaded = await uploadFile(pdfBuffer, "application/pdf", "pdfs");
  if (fullUploaded.error || !fullUploaded.key) {
    return { error: fullUploaded.error ?? "Upload failed" };
  }

  try {
    const { preview, totalPages } = await extractPreviewPdf(pdfBuffer, freePreviewPages);
    const previewUploaded = await uploadFile(preview, "application/pdf", "pdfs");
    if (previewUploaded.error || !previewUploaded.key) {
      return { fullKey: fullUploaded.key, previewKey: null, pageCount: totalPages };
    }
    if (oldPreviewKey) await deleteStoredFile(oldPreviewKey);
    return {
      fullKey: fullUploaded.key,
      previewKey: previewUploaded.key,
      pageCount: totalPages,
    };
  } catch {
    return { fullKey: fullUploaded.key, previewKey: null, pageCount: 0 };
  }
}
