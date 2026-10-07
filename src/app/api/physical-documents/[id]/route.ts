import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializePhysicalDocumentPublic } from "@/lib/physical/serializers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await prisma.physicalDocument.findFirst({
    where: { id: params.id, status: "ACTIVE" },
    include: { sourceNote: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: serializePhysicalDocumentPublic(doc, doc.sourceNote) });
}
