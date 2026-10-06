import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isPopupScheduleActive,
  pathnameMatchesPopupTarget,
  parseTargetPages,
  serializePopupPublic,
} from "@/lib/popups";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.searchParams.get("path") ?? "/";
  if (pathname.startsWith("/admin")) {
    return NextResponse.json({ popups: [] });
  }

  const now = new Date();
  const items = await prisma.sitePopup.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const popups = items
    .filter((p) => isPopupScheduleActive(now, p.validFrom, p.validUntil))
    .filter((p) => pathnameMatchesPopupTarget(pathname, parseTargetPages(p.targetPages)))
    .map(serializePopupPublic);

  return NextResponse.json({ popups });
}
