import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializePhysicalDocumentPublic } from "@/lib/physical/serializers";

export async function GET() {
  const docs = await prisma.physicalDocument.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents: docs.map(serializePhysicalDocumentPublic) });
}
