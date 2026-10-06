import { prisma } from "@/lib/db";
import { getSignedDownloadUrl, uploadFile } from "@/lib/storage";
import { extractPreviewPdf } from "@/lib/pdf-preview";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

function getStorageClient() {
  const endpoint = process.env.STORAGE_URL;
  const accessKeyId = process.env.STORAGE_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function downloadPdf(key: string): Promise<Buffer | null> {
  const client = getStorageClient();
  const bucket = process.env.STORAGE_BUCKET ?? "notes-platform";
  if (!client) return null;
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  return bytes ? Buffer.from(bytes) : null;
}

export async function ensureNotePreview(noteId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || !note.pdfStorageKey) return null;

  const freePages = note.freePreviewPages ?? 2;

  if (note.pdfPreviewStorageKey) {
    return {
      previewKey: note.pdfPreviewStorageKey,
      freePages,
      totalPages: note.pdfPageCount,
      lockedPages: note.pdfPageCount ? Math.max(0, note.pdfPageCount - freePages) : null,
    };
  }

  const full = await downloadPdf(note.pdfStorageKey);
  if (!full) return null;

  const { preview, totalPages } = await extractPreviewPdf(full, freePages);
  const uploaded = await uploadFile(preview, "application/pdf", "pdfs");
  if (uploaded.error || !uploaded.key) return null;

  await prisma.note.update({
    where: { id: noteId },
    data: {
      pdfPreviewStorageKey: uploaded.key,
      pdfPageCount: totalPages,
    },
  });

  return {
    previewKey: uploaded.key,
    freePages,
    totalPages,
    lockedPages: Math.max(0, totalPages - freePages),
  };
}

export async function getPreviewSignedUrl(noteId: string) {
  const meta = await ensureNotePreview(noteId);
  if (!meta) return null;
  const url = await getSignedDownloadUrl(meta.previewKey, 600);
  if (!url) return null;
  return { ...meta, url };
}
