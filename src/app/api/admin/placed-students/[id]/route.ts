import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePlacedStudent } from "@/lib/placement/serialize";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  await prisma.placedStudent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { status?: string; sortOrder?: number };
  const row = await prisma.placedStudent.update({
    where: { id: params.id },
    data: {
      ...(body.status ? { status: body.status as "ACTIVE" | "DISABLED" } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });
  return NextResponse.json({ placedStudent: serializePlacedStudent(row) });
}
