import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { buildAgentCallMetrics } from "@/lib/crm/calls/query";
import { resolveReportRange } from "@/lib/crm/reports/date-range";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.memberRole === "COMPANY_ADMIN" || session.role === "COMPANY_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const range = resolveReportRange({
      preset: sp.get("preset"),
      from: sp.get("from"),
      to: sp.get("to"),
    });

    const agents = await buildAgentCallMetrics({
      companyId: session.companyId,
      from: range.from,
      to: range.to,
      agentId: sp.get("agentId") ?? undefined,
    });

    return NextResponse.json({ range, agents });
  });
}
