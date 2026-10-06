import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdminJson } from "@/lib/api/admin-route";
import { parseSocialLinks, parseTargetPages, serializePopupAdmin } from "@/lib/popups";
import { isAllowedStorageKey } from "@/lib/file-limits";
import { PopupRepeatMode, PopupType, PublishStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePopupType(v: string): PopupType {
  return v === "IMAGE" ? "IMAGE" : "TEXT";
}

function parseRepeatMode(v: string): PopupRepeatMode {
  if (v === "ONCE_PER_SESSION") return "ONCE_PER_SESSION";
  if (v === "ONCE_PER_BROWSER") return "ONCE_PER_BROWSER";
  return "REPEAT";
}

function parseDateOrNull(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  return withAdminJson(async () => {
    const items = await prisma.sitePopup.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ popups: items.map(serializePopupAdmin) });
  });
}

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const popupType = parsePopupType(String(body.popupType ?? "TEXT"));
    const targetPages = parseTargetPages(body.targetPages);
    if (!targetPages.length) {
      return NextResponse.json({ error: "Select at least one page" }, { status: 400 });
    }

    if (popupType === "TEXT" && !String(body.bodyText ?? "").trim() && !String(body.title ?? "").trim()) {
      return NextResponse.json({ error: "Text popup needs a title or message" }, { status: 400 });
    }

    const imageStorageKey = body.imageStorageKey ? String(body.imageStorageKey) : null;
    if (popupType === "IMAGE" && !imageStorageKey) {
      return NextResponse.json({ error: "Image popup requires an uploaded image" }, { status: 400 });
    }
    if (imageStorageKey && !isAllowedStorageKey(imageStorageKey, "covers")) {
      return NextResponse.json({ error: "Invalid image key" }, { status: 400 });
    }

    const created = await prisma.sitePopup.create({
      data: {
        name,
        popupType,
        title: String(body.title ?? "").trim() || null,
        bodyText: String(body.bodyText ?? "").trim() || null,
        imageStorageKey,
        buttonLabel: String(body.buttonLabel ?? "").trim() || null,
        buttonUrl: String(body.buttonUrl ?? "").trim() || null,
        whatsappUrl: String(body.whatsappUrl ?? "").trim() || null,
        socialLinks: parseSocialLinks(body.socialLinks),
        targetPages,
        validFrom: parseDateOrNull(body.validFrom),
        validUntil: parseDateOrNull(body.validUntil),
        repeatMode: parseRepeatMode(String(body.repeatMode ?? "REPEAT")),
        sortOrder: Number(body.sortOrder ?? 0) || 0,
        status: body.status === "DISABLED" ? PublishStatus.DISABLED : PublishStatus.ACTIVE,
      },
    });

    return NextResponse.json({ popup: serializePopupAdmin(created) });
  });
}
