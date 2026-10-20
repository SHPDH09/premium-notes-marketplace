import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { buildPlatformReports } from "@/lib/admin/platform-reports";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const report = await buildPlatformReports();
  return NextResponse.json(report);
}
