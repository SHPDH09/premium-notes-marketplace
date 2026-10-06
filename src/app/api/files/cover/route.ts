import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const url = await getSignedDownloadUrl(key, 3600);
  if (!url) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  return NextResponse.redirect(url);
}
