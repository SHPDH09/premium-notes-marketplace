import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerGetSession, walayerLogoutSession, walayerSessionHealth } from "@/lib/walayer/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const creds = await getWalayerPlatformCredentials();
    if (creds && account.walayerSessionId) {
      const health = await walayerSessionHealth(creds.apiKey, creds.apiBaseUrl, account.walayerSessionId);
      if (health.ok) {
        const info = await walayerGetSession(creds.apiKey, creds.apiBaseUrl, account.walayerSessionId);
        if (info.ok && info.data && typeof info.data === "object") {
          const d = info.data as Record<string, unknown>;
          await prisma.crmWhatsAppAccount.update({
            where: { id: account.id },
            data: {
              phoneE164: typeof d.phone_e164 === "string" ? d.phone_e164 : account.phoneE164,
              displayName: typeof d.label === "string" ? d.label : account.displayName,
            },
          });
        }
      }
    }

    const fresh = await prisma.crmWhatsAppAccount.findUnique({ where: { id: account.id } });
    return NextResponse.json({ account: fresh });
  });
}

const patchSchema = z.object({ label: z.string().min(2).max(80).optional() });

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const updated = await prisma.crmWhatsAppAccount.update({
      where: { id: account.id },
      data: { label: parsed.data.label ?? account.label },
    });
    return NextResponse.json({ account: updated });
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const creds = await getWalayerPlatformCredentials();
    if (creds && account.walayerSessionId) {
      await walayerLogoutSession(creds.apiKey, creds.apiBaseUrl, account.walayerSessionId);
    }
    await prisma.crmWhatsAppAccount.delete({ where: { id: account.id } });
    return NextResponse.json({ ok: true });
  });
}
