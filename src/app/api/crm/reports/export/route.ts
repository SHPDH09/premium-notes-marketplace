import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { resolveReportRange } from "@/lib/crm/reports/date-range";
import {
  buildAgentPerformance,
  buildCompanyReportOverview,
  buildTeamPerformance,
} from "@/lib/crm/reports/company-metrics";

function csvEscape(v: string) {
  if (v.includes(",") || v.includes('"')) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") ?? "overview";
    const range = resolveReportRange({
      preset: sp.get("preset"),
      from: sp.get("from"),
      to: sp.get("to"),
    });
    const filters = {
      companyId: session.companyId,
      from: range.from,
      to: range.to,
    };

    let header: string[] = [];
    let rows: string[][] = [];

    if (type === "agents" && isAdmin) {
      const agents = await buildAgentPerformance(filters);
      header = [
        "agent",
        "team",
        "assigned",
        "resolved",
        "pending",
        "manual_replies",
        "inbound_on_assigned",
      ];
      rows = agents.map((a) => [
        a.name,
        a.team ?? "",
        String(a.assignedConversations),
        String(a.resolvedConversations),
        String(a.pendingConversations),
        String(a.manualReplies),
        String(a.inboundOnAssignedChats),
      ]);
    } else if (type === "teams" && isAdmin) {
      const teams = await buildTeamPerformance(filters);
      header = ["team", "agents", "conversations", "resolved", "pending"];
      rows = teams.map((t) => [
        t.teamName,
        String(t.agents),
        String(t.conversations),
        String(t.resolved),
        String(t.pending),
      ]);
    } else if (type === "overview") {
      const o = await buildCompanyReportOverview(filters);
      header = ["metric", "value"];
      rows = [
        ["conversations_total", String(o.conversations.total)],
        ["conversations_new", String(o.conversations.newInRange)],
        ["messages_inbound", String(o.messages.inbound)],
        ["messages_outbound", String(o.messages.outbound)],
        ["messages_manual", String(o.messages.manualOutbound)],
        ["messages_automation", String(o.messages.automationOutbound)],
        ["delivery_failed", String(o.messages.delivery.failed)],
      ];
    } else {
      return NextResponse.json({ error: "Forbidden or unknown export type" }, { status: 403 });
    }

    const csv = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="crm-report-${type}.csv"`,
      },
    });
  });
}
