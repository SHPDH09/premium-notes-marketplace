import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { ensureStorageCors } from "@/lib/storage-cors";
export { validateImageFile, validatePdfFile } from "@/lib/file-limits";

const bucket = process.env.STORAGE_BUCKET ?? "notes-platform";

function getClient() {
  const endpoint = process.env.STORAGE_URL;
  const accessKeyId = process.env.STORAGE_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function buildStorageKey(folder: "covers" | "pdfs", contentType: string): string {
  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  return `${folder}/${randomUUID()}.${ext}`;
}

export async function createPresignedUpload(params: {
  folder: "covers" | "pdfs";
  contentType: string;
}): Promise<{ key: string; uploadUrl: string; error?: string }> {
  const client = getClient();
  if (!client) {
    return { key: "", uploadUrl: "", error: "Storage is not configured." };
  }

  const key = buildStorageKey(params.folder, params.contentType);
  try {
    await ensureStorageCors();
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: params.contentType,
      }),
      { expiresIn: 900 }
    );
    return { key, uploadUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create upload URL";
    return { key: "", uploadUrl: "", error: message };
  }
}

export async function uploadFile(
  file: Buffer,
  contentType: string,
  folder: "covers" | "pdfs"
): Promise<{ key: string; error?: string }> {
  const client = getClient();
  if (!client) {
    return { key: "", error: "Storage is not configured." };
  }
  const key = buildStorageKey(folder, contentType);
  try {
    const uploadPromise = client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    const timeoutMs = 45_000;
    await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Storage upload timed out. Check STORAGE_* env and bucket name.")),
          timeoutMs
        )
      ),
    ]);

    return { key };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Storage upload failed";
    return { key: "", error: message };
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn = 300): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

export async function deleteStoredFile(key: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function getPublicCoverUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = process.env.STORAGE_PUBLIC_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  return `/api/files/cover?key=${encodeURIComponent(key)}`;
}
