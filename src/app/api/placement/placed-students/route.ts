import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializePlacedStudent } from "@/lib/placement/serialize";

export async function GET() {
  const rows = await prisma.placedStudent.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 24,
  });

  return NextResponse.json({ placedStudents: rows.map(serializePlacedStudent) });
}
