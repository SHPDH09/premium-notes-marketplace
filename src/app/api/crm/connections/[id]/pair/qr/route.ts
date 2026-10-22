import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { qrPayloadToDataUrl, readQrFromEventStream } from "@/lib/walayer/pair-qr";
import {
  walayerGetSession,
  walayerPairStreamUrl,
  walayerStartPair,
} from "@/lib/walayer/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const account = await prisma.crmWhatsAppAccount.findFirst({
      where: { id: ctx.params.id, companyId: session.companyId },
    });
    if (!account?.walayerSessionId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return NextResponse.json({ error: "WALayer not configured" }, { status: 503 });
    }

    const refresh = req.nextUrl.searchParams.get("refresh") === "1";

    async function sessionConnected(): Promise<boolean> {
      const walayerSession = await walayerGetSession(
        creds!.apiKey,
        creds!.apiBaseUrl,
        account!.walayerSessionId!
      );
      if (!walayerSession.ok || !walayerSession.data || typeof walayerSession.data !== "object") {
        return false;
      }
      const s = walayerSession.data as Record<string, unknown>;
      const state = String(s.status ?? s.state ?? s.connection_status ?? "").toLowerCase();
      return state.includes("connected") || state.includes("paired") || state === "open";
    }

    if (await sessionConnected()) {
      await prisma.crmWhatsAppAccount.update({
        where: { id: account.id },
        data: { status: "CONNECTED", statusMessage: null, lastConnectedAt: new Date() },
      });
      return NextResponse.json({
        status: "connected",
        qrImage: null,
        message: "WhatsApp is linked for this number.",
      });
    }

    if (!refresh) {
      return NextResponse.json({
        status: "waiting",
        qrImage: null,
        message: "Waiting for scan… use Refresh QR if the code expired.",
      });
    }

    const pair = await walayerStartPair(creds.apiKey, creds.apiBaseUrl, account.walayerSessionId);
    let pairHint = "";
    if (pair.ok) {
      const fromPost =
        (await qrPayloadToDataUrl(pair.data)) ??
        (await qrPayloadToDataUrl(pair.raw)) ??
        (await qrPayloadToDataUrl({ data: pair.data, raw: pair.raw }));
      if (fromPost) {
        return NextResponse.json({
          status: "qr",
          qrImage: fromPost,
          message: "Scan with WhatsApp → Linked devices → Link a device.",
        });
      }
      pairHint = "Pair started; waiting for QR frames.";
    } else {
      pairHint = pair.error;
    }

    const streamUrl = walayerPairStreamUrl(creds.apiBaseUrl, account.walayerSessionId);
    const upstream = await fetch(streamUrl, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          status: "error",
          qrImage: null,
          message: pairHint
            ? `Could not open QR stream (${pairHint}). Check WALayer API key and session.`
            : "Could not open QR stream from WALayer. Try Reconnect QR again.",
        },
        { status: 502 }
      );
    }

    const qrImage = await readQrFromEventStream(upstream.body, 28000);
    if (qrImage) {
      return NextResponse.json({
        status: "qr",
        qrImage,
        message: "Scan with WhatsApp → Linked devices → Link a device.",
      });
    }

    return NextResponse.json({
      status: "waiting",
      qrImage: null,
      message: "Waiting for QR from WhatsApp… keep this page open and retry in a few seconds.",
    });
  });
}
