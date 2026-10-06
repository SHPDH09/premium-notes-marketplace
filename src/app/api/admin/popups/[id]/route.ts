import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdminJson } from "@/lib/api/admin-route";
import { parseSocialLinks, parseTargetPages, serializePopupAdmin } from "@/lib/popups";
import { isAllowedStorageKey } from "@/lib/file-limits";
import { PopupRepeatMode, PopupType, Prisma, PublishStatus } from "@prisma/client";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const existing = await prisma.sitePopup.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const data: Prisma.SitePopupUpdateInput = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.popupType !== undefined) data.popupType = parsePopupType(String(body.popupType));
    if (body.title !== undefined) data.title = String(body.title).trim() || null;
    if (body.bodyText !== undefined) data.bodyText = String(body.bodyText).trim() || null;
    if (body.imageStorageKey !== undefined) {
      const key = body.imageStorageKey ? String(body.imageStorageKey) : null;
      if (key && !isAllowedStorageKey(key, "covers")) {
        return NextResponse.json({ error: "Invalid image key" }, { status: 400 });
      }
      data.imageStorageKey = key;
    }
    if (body.buttonLabel !== undefined) data.buttonLabel = String(body.buttonLabel).trim() || null;
    if (body.buttonUrl !== undefined) data.buttonUrl = String(body.buttonUrl).trim() || null;
    if (body.whatsappUrl !== undefined) data.whatsappUrl = String(body.whatsappUrl).trim() || null;
    if (body.socialLinks !== undefined) data.socialLinks = parseSocialLinks(body.socialLinks);
    if (body.targetPages !== undefined) {
      const pages = parseTargetPages(body.targetPages);
      if (!pages.length) return NextResponse.json({ error: "Select at least one page" }, { status: 400 });
      data.targetPages = pages;
    }
    if (body.validFrom !== undefined) data.validFrom = parseDateOrNull(body.validFrom);
    if (body.validUntil !== undefined) data.validUntil = parseDateOrNull(body.validUntil);
    if (body.repeatMode !== undefined) data.repeatMode = parseRepeatMode(String(body.repeatMode));
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.status !== undefined) {
      data.status = body.status === "DISABLED" ? PublishStatus.DISABLED : PublishStatus.ACTIVE;
    }

    const updated = await prisma.sitePopup.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ popup: serializePopupAdmin(updated) });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    await prisma.sitePopup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
