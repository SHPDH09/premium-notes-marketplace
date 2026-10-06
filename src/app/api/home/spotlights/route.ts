import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";

export async function GET() {
  const spotlights = await prisma.studentSpotlight.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 12,
  });

  return NextResponse.json({ spotlights: spotlights.map(serializeSpotlight) });
}
