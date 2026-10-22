import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const calls = await prisma.crmCallRecord.findMany({
      where: { companyId: session.companyId },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      calls: calls.map((c) => ({
        id: c.id,
        direction: c.direction,
        status: c.status,
        callerJid: c.callerJid,
        chatJid: c.chatJid,
        startedAt: c.startedAt.toISOString(),
        durationSec: c.durationSec,
        providerCallId: c.providerCallId,
      })),
      limitations:
        "WALayer exposes POST /calls/:id/reject for incoming calls only. Outgoing calls and in-browser answer are not available via the public API.",
    });
  });
}
