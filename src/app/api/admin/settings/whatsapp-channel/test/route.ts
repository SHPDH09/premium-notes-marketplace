import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { formatZodFlatten } from "@/lib/api/format-api-error";
import { decryptWhatsAppApiKey, getWhatsAppChannelSettingsRecord } from "@/lib/whatsapp-channel/settings";
import { WALAYER_DEFAULT_API_BASE, walayerTestConnection } from "@/lib/whatsapp-channel/walayer-provider";

const schema = z.object({
  apiKey: z.string().min(8).optional(),
  sessionId: z.string().min(3).optional(),
  apiBaseUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodFlatten(parsed.error.flatten()) }, { status: 400 });
    }

    const row = await getWhatsAppChannelSettingsRecord();
    const apiKey =
      parsed.data.apiKey?.trim() ||
      (row?.apiKeyEnc ? decryptWhatsAppApiKey(row.apiKeyEnc) : null);
    const sessionId = parsed.data.sessionId?.trim() || row?.sessionId?.trim() || "";
    const apiBaseUrl = parsed.data.apiBaseUrl?.trim() || row?.apiBaseUrl || WALAYER_DEFAULT_API_BASE;

    if (!apiKey) {
      return NextResponse.json({ error: "Save an API key first or pass one for testing" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "Save a session ID first or pass one for testing" }, { status: 400 });
    }

    const result = await walayerTestConnection(apiKey, sessionId, apiBaseUrl);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: "Connection OK — WALayer session reachable" });
  });
}
