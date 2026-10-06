import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { noteId: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const purchase = await prisma.purchase.findUnique({
    where: {
      userId_noteId: { userId: auth.session!.user.id, noteId: params.noteId },
    },
    include: { note: true },
  });

  if (!purchase) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  const note = purchase.note;
  if (note.notesLink) {
    return NextResponse.json({ type: "link", url: note.notesLink });
  }

  if (note.pdfStorageKey) {
    const url = await getSignedDownloadUrl(note.pdfStorageKey, 600);
    if (!url) {
      return NextResponse.json({ error: "File access unavailable" }, { status: 503 });
    }
    return NextResponse.json({ type: "pdf", url });
  }

  return NextResponse.json({ error: "No content available" }, { status: 404 });
}
