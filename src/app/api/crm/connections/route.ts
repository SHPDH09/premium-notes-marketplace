import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { assertCanAddWhatsAppNumber } from "@/lib/crm/limits";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerCreateSession } from "@/lib/walayer/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const rows = await prisma.crmWhatsAppAccount.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      accounts: rows.map((a) => ({
        id: a.id,
        label: a.label,
        status: a.status,
        statusMessage: a.statusMessage,
        phoneE164: a.phoneE164,
        displayName: a.displayName,
        provider: a.provider,
        lastConnectedAt: a.lastConnectedAt?.toISOString() ?? null,
        hasSession: !!a.walayerSessionId,
      })),
    });
  });
}

const postSchema = z.object({ label: z.string().min(2).max(80) });

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    await assertCanAddWhatsAppNumber(session.companyId!);

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }

    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return NextResponse.json({ error: "Platform WALayer API key not configured" }, { status: 503 });
    }

    const created = await walayerCreateSession(creds.apiKey, creds.apiBaseUrl, parsed.data.label);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }

    const sessionId =
      typeof created.data === "object" && created.data && "id" in created.data
        ? String((created.data as { id: string }).id)
        : null;
    if (!sessionId) {
      return NextResponse.json({ error: "Provider did not return session id" }, { status: 502 });
    }

    const account = await prisma.crmWhatsAppAccount.create({
      data: {
        companyId: session.companyId!,
        label: parsed.data.label,
        walayerSessionId: sessionId,
        status: "CONNECTING",
        statusMessage: "Scan QR code to link WhatsApp",
      },
    });

    return NextResponse.json({ account: { id: account.id, status: account.status } }, { status: 201 });
  });
}
