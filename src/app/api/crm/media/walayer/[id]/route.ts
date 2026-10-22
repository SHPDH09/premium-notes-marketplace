import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerGetMediaReadUrl } from "@/lib/walayer/client";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    await requireCompanyMember();
    const creds = await getWalayerPlatformCredentials();
    if (!creds) {
      return NextResponse.json({ error: "Provider not configured" }, { status: 503 });
    }

    const mediaId = decodeURIComponent(ctx.params.id);
    const result = await walayerGetMediaReadUrl(creds.apiKey, creds.apiBaseUrl, mediaId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 502 });
    }

    const url =
      (typeof result.data.url === "string" && result.data.url) ||
      (typeof result.data.read_url === "string" && result.data.read_url) ||
      null;

    if (!url) {
      return NextResponse.json({ error: "Media URL unavailable" }, { status: 404 });
    }

    return NextResponse.redirect(url, 302);
  });
}
