import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeNotePublic } from "@/lib/serializers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note || note.status !== "ACTIVE") {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  let owned = false;
  if (session?.user?.role === "STUDENT") {
    const purchase = await prisma.purchase.findUnique({
      where: { userId_noteId: { userId: session.user.id, noteId: note.id } },
    });
    owned = !!purchase;
  }

  return NextResponse.json({ note: serializeNotePublic(note, owned) });
}
