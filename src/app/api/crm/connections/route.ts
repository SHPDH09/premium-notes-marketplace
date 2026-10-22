import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { assertCanAddWhatsAppNumber } from "@/lib/crm/limits";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerCreateSession, walayerStartPair } from "@/lib/walayer/client";
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

const postSchema = z.object({
  label: z.string().min(2).max(80),
  /** ISO 3166-1 alpha-2 — required by WALayer (e.g. IN, US). */
  country: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .default("IN"),
});

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

    const created = await walayerCreateSession(creds.apiKey, creds.apiBaseUrl, {
      label: parsed.data.label.trim(),
      country: parsed.data.country ?? "IN",
    });
    if (!created.ok) {
      const hint =
        created.error.includes("VALIDATION") || created.status === 400
          ? " Check WALayer session fields (country is required)."
          : "";
      return NextResponse.json({ error: `${created.error}${hint}` }, { status: 400 });
    }

    const data = created.data as Record<string, unknown> | null;
    const sessionId =
      data && typeof data.id === "string"
        ? data.id
        : data && typeof data.session_id === "string"
          ? data.session_id
          : null;
    if (!sessionId) {
      return NextResponse.json({ error: "Provider did not return session id" }, { status: 502 });
    }

    const pair = await walayerStartPair(creds.apiKey, creds.apiBaseUrl, sessionId);
    if (!pair.ok) {
      return NextResponse.json(
        { error: `Session created but pairing failed: ${pair.error}` },
        { status: 400 }
      );
    }

    const account = await prisma.crmWhatsAppAccount.create({
      data: {
        companyId: session.companyId!,
        label: parsed.data.label.trim(),
        walayerSessionId: sessionId,
        status: "CONNECTING",
        statusMessage: "Scan QR code to link WhatsApp",
      },
    });

    return NextResponse.json({ account: { id: account.id, status: account.status } }, { status: 201 });
  });
}
