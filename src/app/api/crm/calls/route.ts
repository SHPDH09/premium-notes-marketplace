import { NextRequest, NextResponse } from "next/server";
import type { CrmCallDirection, CrmCallRecordStatus } from "@prisma/client";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getCallCapabilities } from "@/lib/crm/calls/capabilities";
import { buildCallStats, listCallRecords } from "@/lib/crm/calls/query";
import { serializeCallRow } from "@/lib/crm/calls/serialize";
import { resolveReportRange } from "@/lib/crm/reports/date-range";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.memberRole === "COMPANY_ADMIN" || session.role === "COMPANY_ADMIN";
    const sp = req.nextUrl.searchParams;

    const range = resolveReportRange({
      preset: sp.get("preset"),
      from: sp.get("from"),
      to: sp.get("to"),
    });

    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(10, Number(sp.get("pageSize") ?? "25") || 25));

    const direction = sp.get("direction") as CrmCallDirection | null;
    const status = sp.get("status") as CrmCallRecordStatus | null;

    const [capabilities, stats, list] = await Promise.all([
      getCallCapabilities(session.companyId),
      buildCallStats({
        companyId: session.companyId,
        memberId: session.memberId,
        isAdmin,
        from: range.from,
        to: range.to,
      }),
      listCallRecords({
        companyId: session.companyId,
        memberId: session.memberId,
        isAdmin,
        from: range.from,
        to: range.to,
        q: sp.get("q") ?? undefined,
        direction: direction && ["INBOUND", "OUTBOUND"].includes(direction) ? direction : undefined,
        status:
          status && ["RINGING", "ANSWERED", "REJECTED", "MISSED", "FAILED"].includes(status)
            ? status
            : undefined,
        contactId: sp.get("contactId") ?? undefined,
        agentId: sp.get("agentId") ?? undefined,
        sort: (sp.get("sort") as "started_desc" | "started_asc" | "duration_desc") ?? "started_desc",
        page,
        pageSize,
      }),
    ]);

    return NextResponse.json({
      range,
      capabilities,
      stats,
      calls: list.rows.map((r) => serializeCallRow(r)),
      pagination: {
        page,
        pageSize,
        total: list.total,
        totalPages: Math.ceil(list.total / pageSize),
      },
    });
  });
}
