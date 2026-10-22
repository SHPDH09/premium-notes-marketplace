import { NextRequest } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerPairStreamUrl, walayerStartPair } from "@/lib/walayer/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Server-side proxy for WALayer QR pairing SSE — API key never sent to browser. */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireCompanyMember({ adminOnly: true });
    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!account?.walayerSessionId) {
      return new Response("Not found", { status: 404 });
    }

    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return new Response("Provider not configured", { status: 503 });
    }

    const pair = await walayerStartPair(creds.apiKey, creds.apiBaseUrl, account.walayerSessionId);

    const url = walayerPairStreamUrl(creds.apiBaseUrl, account.walayerSessionId);
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.apiKey}`, Accept: "text/event-stream" },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      const detail = pair.ok ? `stream HTTP ${upstream.status}` : pair.error;
      return new Response(`Pair stream unavailable (${detail})`, { status: upstream.status || 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
