import type { PDFDocumentProxy } from "pdfjs-dist";

let workerReady = false;

export async function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerReady = true;
  }
  return pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
}
