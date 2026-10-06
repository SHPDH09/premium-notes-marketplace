import { PDFDocument } from "pdf-lib";

export async function extractPreviewPdf(fullPdf: Buffer, maxPages: number): Promise<{
  preview: Buffer;
  totalPages: number;
}> {
  const source = await PDFDocument.load(fullPdf, { ignoreEncryption: true });
  const totalPages = source.getPageCount();
  const pagesToCopy = Math.min(Math.max(1, maxPages), totalPages);

  const previewDoc = await PDFDocument.create();
  const copied = await previewDoc.copyPages(
    source,
    Array.from({ length: pagesToCopy }, (_, i) => i)
  );
  copied.forEach((p) => previewDoc.addPage(p));

  const preview = Buffer.from(await previewDoc.save());
  return { preview, totalPages };
}
