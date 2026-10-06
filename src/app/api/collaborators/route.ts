import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { CollaboratorType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as CollaboratorType | null;

  const items = await prisma.collaborator.findMany({
    where: {
      status: "ACTIVE",
      ...(type ? { type } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ collaborators: items.map(serializeCollaborator) });
}
