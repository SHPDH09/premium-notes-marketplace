import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { formatZodFlatten } from "@/lib/api/format-api-error";
import { decryptWhatsAppApiKey, getWhatsAppChannelSettingsRecord } from "@/lib/whatsapp-channel/settings";
import { WAPITO_DEFAULT_API_BASE, wapitoTestConnection } from "@/lib/whatsapp-channel/wapito-provider";

const schema = z.object({
  apiKey: z.string().min(8).optional(),
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
    const apiBaseUrl = parsed.data.apiBaseUrl?.trim() || row?.apiBaseUrl || WAPITO_DEFAULT_API_BASE;

    if (!apiKey) {
      return NextResponse.json({ error: "Save an API key first or pass one for testing" }, { status: 400 });
    }

    const result = await wapitoTestConnection(apiKey, apiBaseUrl);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: "Connection OK — session API key accepted" });
  });
}
