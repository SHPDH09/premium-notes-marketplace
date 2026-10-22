import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getCallCapabilities } from "@/lib/crm/calls/capabilities";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    const isAdmin =
      session.memberRole === "COMPANY_ADMIN" || session.role === "COMPANY_ADMIN";

    const call = await prisma.crmCallRecord.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && call.assignedMemberId && call.assignedMemberId !== session.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const capabilities = await getCallCapabilities(session.companyId);
    if (!capabilities.recordings) {
      return NextResponse.json(
        { error: "Call recordings are not supported by the connected provider." },
        { status: 501 }
      );
    }

    if (!call.recordingRef) {
      return NextResponse.json({ error: "No recording for this call" }, { status: 404 });
    }

    return NextResponse.json({ error: "Recording playback not configured" }, { status: 501 });
  });
}
