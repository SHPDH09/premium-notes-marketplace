import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getCompanyLimits } from "@/lib/crm/limits";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    const session = await getCrmSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let company = null;
    let limits = null;
    if (session.companyId) {
      company = await prisma.crmCompany.findUnique({
        where: { id: session.companyId },
        select: { id: true, name: true, slug: true, brandColor: true, status: true },
      });
      limits = await getCompanyLimits(session.companyId);
    }
    return NextResponse.json({
      user: session,
      company,
      limits,
      providerNotes: {
        calling:
          "WALayer supports rejecting incoming calls via API only. Outgoing CRM calls and in-app answer are not exposed in the public API — use your phone for voice.",
        deliveryWebhooks:
          "Delivery/read receipt webhooks are reserved in WALayer docs; poll message status via REST or refresh the inbox.",
      },
    });
  });
}
