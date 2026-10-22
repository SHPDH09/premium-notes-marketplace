import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerRejectCall } from "@/lib/walayer/client";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const call = await prisma.crmCallRecord.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!call?.providerCallId) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { companyId: session.companyId, status: "CONNECTED" },
    });
    const creds = await getWalayerPlatformCredentials();
    if (!creds || !account?.walayerSessionId) {
      return NextResponse.json({ error: "WhatsApp session unavailable" }, { status: 503 });
    }

    const result = await walayerRejectCall(
      creds.apiKey,
      creds.apiBaseUrl,
      account.walayerSessionId,
      call.providerCallId
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.crmCallRecord.update({
      where: { id: call.id },
      data: { status: "REJECTED", endedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  });
}
