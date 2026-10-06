import { validateImageFile, validatePdfFile, VERCEL_SAFE_INLINE_BYTES } from "@/lib/file-limits";
import { readJsonResponse } from "@/lib/api/fetch-json";

async function uploadViaServer(
  file: File,
  folder: "covers" | "pdfs"
): Promise<{ key: string } | { error: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/uploads/direct?folder=${folder}`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = await readJsonResponse<{ key?: string; error?: string }>(res);
  if (!res.ok || !data.key) {
    return { error: data.error ?? `Server upload failed (${res.status})` };
  }
  return { key: data.key };
}

async function uploadViaPresignedPut(
  file: File,
  folder: "covers" | "pdfs"
): Promise<{ key: string } | { error: string }> {
  const presignRes = await fetch("/api/admin/uploads/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      contentType: file.type,
      size: file.size,
    }),
  });

  const presign = await readJsonResponse<{ key?: string; uploadUrl?: string; error?: string }>(
    presignRes
  );
  if (!presignRes.ok || !presign.uploadUrl || !presign.key) {
    return { error: presign.error ?? "Could not start upload." };
  }

  let putRes: Response;
  try {
    putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
  } catch {
    return {
      error:
        "Browser could not reach storage (network/CORS). Try again or use a file under 4MB for server upload.",
    };
  }

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    if (file.size <= VERCEL_SAFE_INLINE_BYTES) {
      const fallback = await uploadViaServer(file, folder);
      if ("key" in fallback) return fallback;
    }
    return {
      error:
        detail ||
        `Storage rejected upload (HTTP ${putRes.status}). Check STORAGE_* env and bucket "${folder}" permissions.`,
    };
  }

  return { key: presign.key };
}

export async function uploadAdminFileDirect(
  file: File,
  folder: "covers" | "pdfs"
): Promise<{ key: string } | { error: string }> {
  const validation = folder === "covers" ? validateImageFile(file) : validatePdfFile(file);
  if (validation) return { error: validation };

  if (file.size <= VERCEL_SAFE_INLINE_BYTES) {
    const server = await uploadViaServer(file, folder);
    if ("key" in server) return server;
  }

  return uploadViaPresignedPut(file, folder);
}
