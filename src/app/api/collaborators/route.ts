import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { CollaboratorType } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") as CollaboratorType | null;

    const items = await prisma.collaborator.findMany({
      where: {
        status: "ACTIVE",
        ...(type ? { type } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ collaborators: items.map(serializeCollaborator) });
  } catch (e) {
    console.error("public collaborators GET", e);
    const message = e instanceof Error ? e.message : "Failed to load collaborators";
    return NextResponse.json({ error: message, collaborators: [] }, { status: 500 });
  }
}
