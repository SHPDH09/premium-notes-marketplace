import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { createPresignedUpload } from "@/lib/storage";
import { ensureStorageCors } from "@/lib/storage-cors";
import { validatePresignRequest } from "@/lib/file-limits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { contentType?: string; size?: number };
  const contentType = String(body.contentType ?? "");
  const size = Number(body.size);

  const validationError = validatePresignRequest("resumes", contentType, size);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await ensureStorageCors();
  const result = await createPresignedUpload({ folder: "resumes", contentType });
  if (result.error || !result.key || !result.uploadUrl) {
    return NextResponse.json({ error: result.error ?? "Storage not configured" }, { status: 500 });
  }

  return NextResponse.json({ key: result.key, uploadUrl: result.uploadUrl });
}
