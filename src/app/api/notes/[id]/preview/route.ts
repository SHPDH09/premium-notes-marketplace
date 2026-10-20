import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPreviewSignedUrl } from "@/lib/note-preview-server";
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

  if (owned && note.pdfStorageKey) {
    return NextResponse.json({
      owned: true,
      url: `/api/notes/${note.id}/preview-stream`,
      freePages: note.pdfPageCount ?? note.freePreviewPages,
      totalPages: note.pdfPageCount,
      lockedPages: 0,
    });
  }

  if (!note.pdfStorageKey && note.notesLink) {
    return NextResponse.json({
      owned: false,
      externalLink: true,
      freePages: 0,
      totalPages: null,
      lockedPages: null,
      message: "Purchase to access external notes link.",
    });
  }

  const preview = await getPreviewSignedUrl(note.id);
  if (!preview) {
    return NextResponse.json({ error: "Preview not available" }, { status: 503 });
  }

  return NextResponse.json({
    owned: false,
    url: `/api/notes/${note.id}/preview-stream`,
    freePages: preview.freePages,
    totalPages: preview.totalPages,
    lockedPages: preview.lockedPages,
    finalPrice: note.finalPrice.toString(),
    title: note.title,
  });
}
