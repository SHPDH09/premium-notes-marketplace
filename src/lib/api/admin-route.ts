import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";

export async function withAdminJson(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    return await handler();
  } catch (e) {
    console.error("admin API error", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
