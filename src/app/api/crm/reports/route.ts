import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { resolveReportRange } from "@/lib/crm/reports/date-range";
import {
  buildAgentPerformance,
  buildCallReports,
  buildCampaignReports,
  buildCompanyReportOverview,
  buildConversationTrend,
  buildMessageTrend,
  buildTeamPerformance,
  buildWhatsAppNumberReports,
} from "@/lib/crm/reports/company-metrics";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const sp = req.nextUrl.searchParams;
    const company = await prisma.crmCompany.findUnique({
      where: { id: session.companyId },
      select: { timezone: true },
    });
    const range = resolveReportRange({
      preset: sp.get("preset"),
      from: sp.get("from"),
      to: sp.get("to"),
    });

    const filters = {
      companyId: session.companyId,
      from: range.from,
      to: range.to,
      agentId: sp.get("agentId") ?? undefined,
      teamId: sp.get("teamId") ?? undefined,
      whatsappAccountId: sp.get("whatsappAccountId") ?? undefined,
    };

    const section = sp.get("section") ?? "overview";

    const generatedAt = new Date().toISOString();

    if (section === "overview") {
      const overview = await buildCompanyReportOverview(filters);
      const [conversationTrend, messageTrend] = await Promise.all([
        buildConversationTrend(filters),
        buildMessageTrend(filters),
      ]);
      return NextResponse.json({
        generatedAt,
        range,
        timezone: company?.timezone ?? "Asia/Kolkata",
        overview,
        charts: { conversationTrend, messageTrend },
      });
    }

    if (section === "agents") {
      const agents = await buildAgentPerformance(filters);
      return NextResponse.json({ generatedAt, range, agents });
    }

    if (section === "teams") {
      const teams = await buildTeamPerformance(filters);
      return NextResponse.json({ generatedAt, range, teams });
    }

    if (section === "whatsapp") {
      const numbers = await buildWhatsAppNumberReports(filters);
      return NextResponse.json({ generatedAt, range, numbers });
    }

    if (section === "campaigns") {
      const campaigns = await buildCampaignReports(filters);
      return NextResponse.json({ generatedAt, range, campaigns });
    }

    if (section === "calls") {
      const calls = await buildCallReports(filters);
      return NextResponse.json({ generatedAt, range, calls });
    }

    const isAdmin =
      session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";
    if (section === "agent-self" && session.memberId) {
      const agents = await buildAgentPerformance({ ...filters, agentId: session.memberId });
      return NextResponse.json({ generatedAt, range, agent: agents[0] ?? null, isAdmin });
    }

    if (!isAdmin && section !== "agent-self") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  });
}
