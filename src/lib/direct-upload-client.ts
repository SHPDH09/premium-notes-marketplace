import { validateImageFile, validatePdfFile } from "@/lib/file-limits";
import { readJsonResponse } from "@/lib/api/fetch-json";

export async function uploadAdminFileDirect(
  file: File,
  folder: "covers" | "pdfs"
): Promise<{ key: string } | { error: string }> {
  const validation = folder === "covers" ? validateImageFile(file) : validatePdfFile(file);
  if (validation) return { error: validation };

  const presignRes = await fetch("/api/admin/uploads/presign", {
    method: "POST",
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

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!putRes.ok) {
    return {
      error:
        "Direct upload to storage failed. Ensure your storage bucket allows CORS PUT from this site.",
    };
  }

  return { key: presign.key };
}
