import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { resolveReportRange } from "@/lib/crm/reports/date-range";
import {
  buildCompanyPerformanceTable,
  buildPlatformReportOverview,
} from "@/lib/crm/reports/platform-metrics";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const sp = req.nextUrl.searchParams;
    const range = resolveReportRange({
      preset: sp.get("preset"),
      from: sp.get("from"),
      to: sp.get("to"),
    });
    const section = sp.get("section") ?? "overview";

    if (section === "companies") {
      const companies = await buildCompanyPerformanceTable(range.from, range.to);
      const status = sp.get("status");
      const plan = sp.get("plan");
      let filtered = companies;
      if (status) filtered = filtered.filter((c) => c.status === status);
      if (plan) filtered = filtered.filter((c) => c.plan === plan);
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        range,
        companies: filtered,
      });
    }

    const overview = await buildPlatformReportOverview(range.from, range.to);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      range,
      overview,
    });
  });
}
