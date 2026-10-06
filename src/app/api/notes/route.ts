import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeNotePublic } from "@/lib/serializers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NoteStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minDiscount = searchParams.get("minDiscount");
  const sort = searchParams.get("sort") ?? "newest";
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const where: Prisma.NoteWhereInput = {};
  if (!isAdmin || status !== "all") {
    where.status = NoteStatus.ACTIVE;
  } else if (status === "all") {
    // admin all
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (minPrice || maxPrice) {
    where.finalPrice = {};
    if (minPrice) where.finalPrice.gte = minPrice;
    if (maxPrice) where.finalPrice.lte = maxPrice;
  }

  if (minDiscount) {
    where.discountValue = { gte: minDiscount };
  }

  let orderBy: Prisma.NoteOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { finalPrice: "asc" };
  if (sort === "price_desc") orderBy = { finalPrice: "desc" };
  if (sort === "popular") orderBy = { purchaseCount: "desc" };

  const notes = await prisma.note.findMany({ where, orderBy, take: limit });

  let ownedIds = new Set<string>();
  if (session?.user?.id && session.user.role === "STUDENT") {
    const purchases = await prisma.purchase.findMany({
      where: { userId: session.user.id, noteId: { in: notes.map((n) => n.id) } },
      select: { noteId: true },
    });
    ownedIds = new Set(purchases.map((p) => p.noteId));
  }

  return NextResponse.json({
    notes: notes.map((n) => serializeNotePublic(n, ownedIds.has(n.id))),
  });
}
