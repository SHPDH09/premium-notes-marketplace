import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializePhysicalDocumentPublic } from "@/lib/physical/serializers";
import { Prisma, PublishStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") ?? "newest";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const where: Prisma.PhysicalDocumentWhereInput = { status: PublishStatus.ACTIVE };

  if (minPrice || maxPrice) {
    where.finalPrice = {};
    if (minPrice) where.finalPrice.gte = minPrice;
    if (maxPrice) where.finalPrice.lte = maxPrice;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      {
        sourceNote: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  let orderBy: Prisma.PhysicalDocumentOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { finalPrice: "asc" };
  if (sort === "price_desc") orderBy = { finalPrice: "desc" };
  if (sort === "popular") orderBy = { sourceNote: { purchaseCount: "desc" } };

  const docs = await prisma.physicalDocument.findMany({
    where,
    include: { sourceNote: true },
    orderBy,
    take: limit,
  });

  return NextResponse.json({
    documents: docs.map((d) => serializePhysicalDocumentPublic(d, d.sourceNote)),
  });
}
