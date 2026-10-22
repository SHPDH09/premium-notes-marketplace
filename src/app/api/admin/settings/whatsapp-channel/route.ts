import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { formatZodFlatten } from "@/lib/api/format-api-error";
import { prisma } from "@/lib/db";
import {
  ensureWhatsAppChannelSettings,
  getWhatsAppChannelSettingsRecord,
  saveWhatsAppChannelSettings,
} from "@/lib/whatsapp-channel/settings";

export async function GET() {
  return withAdminJson(async () => {
    const row = await ensureWhatsAppChannelSettings();
    const recentPosts = await prisma.jobWhatsAppChannelPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        job: { select: { id: true, title: true, company: true, status: true } },
      },
    });

    return NextResponse.json({
      settings: {
        enabled: row.enabled,
        provider: row.provider,
        apiBaseUrl: row.apiBaseUrl,
        sessionId: row.sessionId ?? "",
        channelId: row.channelId ?? "",
        hasApiKey: !!row.apiKeyEnc,
      },
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        jobId: p.jobId,
        jobTitle: p.job.title,
        company: p.job.company,
        status: p.status,
        errorMessage: p.errorMessage,
        postedAt: p.postedAt?.toISOString() ?? null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      note:
        "Uses WALayer (https://walayer.com) — posts via your linked session to the channel newsletter JID (@newsletter). Not Meta Cloud API.",
    });
  });
}

const patchSchema = z.object({
  enabled: z.boolean(),
  sessionId: z.string().min(3),
  channelId: z.string().min(5),
  apiKey: z.string().min(8).optional(),
  apiBaseUrl: z.string().url().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAdminJson(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodFlatten(parsed.error.flatten()) }, { status: 400 });
    }

    const existing = await getWhatsAppChannelSettingsRecord();
    if (!parsed.data.apiKey?.trim() && !existing?.apiKeyEnc) {
      return NextResponse.json({ error: "API key is required on first setup" }, { status: 400 });
    }

    await saveWhatsAppChannelSettings({
      enabled: parsed.data.enabled,
      sessionId: parsed.data.sessionId,
      channelId: parsed.data.channelId,
      apiKey: parsed.data.apiKey,
      apiBaseUrl: parsed.data.apiBaseUrl,
    });

    const row = await ensureWhatsAppChannelSettings();
    return NextResponse.json({
      settings: {
        enabled: row.enabled,
        provider: row.provider,
        apiBaseUrl: row.apiBaseUrl,
        sessionId: row.sessionId ?? "",
        channelId: row.channelId ?? "",
        hasApiKey: !!row.apiKeyEnc,
      },
    });
  });
}
