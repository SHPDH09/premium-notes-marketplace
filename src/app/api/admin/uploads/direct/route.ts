import { NextRequest, NextResponse } from "next/server";
import { withAdminJson } from "@/lib/api/admin-route";
import { uploadFile } from "@/lib/storage";
import { validatePresignRequest, VERCEL_SAFE_INLINE_BYTES } from "@/lib/file-limits";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const folder = req.nextUrl.searchParams.get("folder");
    if (folder !== "covers" && folder !== "pdfs") {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > VERCEL_SAFE_INLINE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large for server upload (max ${Math.floor(VERCEL_SAFE_INLINE_BYTES / (1024 * 1024))}MB). Use direct storage upload.`,
        },
        { status: 413 }
      );
    }

    const validationError = validatePresignRequest(folder, file.type, file.size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(buf, file.type, folder);
    if (uploaded.error || !uploaded.key) {
      return NextResponse.json({ error: uploaded.error ?? "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ key: uploaded.key });
  });
}
