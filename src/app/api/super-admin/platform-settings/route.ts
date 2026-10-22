import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import {
  ensureCrmPlatformSettings,
  saveCrmPlatformWalayerSettings,
} from "@/lib/crm/platform-settings";
import { z } from "zod";

export async function GET() {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const row = await ensureCrmPlatformSettings();
    return NextResponse.json({
      settings: {
        walayerApiBaseUrl: row.walayerApiBaseUrl,
        hasWalayerApiKey: !!row.walayerApiKeyEnc,
        hasWebhookSecret: !!row.webhookSecretEnc,
        walayerWebhookId: row.walayerWebhookId,
        webhookUrl: `${process.env.NEXTAUTH_URL ?? ""}/api/webhooks/walayer`.replace(/\/$/, ""),
      },
    });
  });
}

const patchSchema = z.object({
  walayerApiKey: z.string().min(8).optional(),
  walayerApiBaseUrl: z.string().url().optional(),
  webhookSecret: z.string().min(16).optional(),
});

export async function PATCH(req: NextRequest) {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await saveCrmPlatformWalayerSettings(parsed.data);
    return NextResponse.json({ ok: true });
  });
}
