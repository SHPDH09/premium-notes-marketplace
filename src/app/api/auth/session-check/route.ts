import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api/auth-helpers";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  return NextResponse.json({ ok: true });
}
