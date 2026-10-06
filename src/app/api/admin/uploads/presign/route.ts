import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { createPresignedUpload } from "@/lib/storage";
import { ensureStorageCors } from "@/lib/storage-cors";
import { validatePresignRequest } from "@/lib/file-limits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as {
      folder?: "covers" | "pdfs";
      contentType?: string;
      size?: number;
    };

    const folder = body.folder;
    const contentType = String(body.contentType ?? "");
    const size = Number(body.size);

    if (folder !== "covers" && folder !== "pdfs") {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const validationError = validatePresignRequest(folder, contentType, size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await ensureStorageCors();
    const result = await createPresignedUpload({ folder, contentType });
    if (result.error || !result.key || !result.uploadUrl) {
      return NextResponse.json({ error: result.error ?? "Storage not configured" }, { status: 500 });
    }

    return NextResponse.json({ key: result.key, uploadUrl: result.uploadUrl });
  } catch (e) {
    console.error("presign upload", e);
    const message = e instanceof Error ? e.message : "Presign failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
