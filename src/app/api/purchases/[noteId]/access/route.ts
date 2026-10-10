import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";

/** Returns in-app viewer path only — no direct download URLs. */
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
    return NextResponse.json({
      type: "viewer",
      viewerPath: `/purchases/${params.noteId}/view`,
      external: true,
    });
  }

  if (note.pdfStorageKey) {
    return NextResponse.json({
      type: "viewer",
      viewerPath: `/purchases/${params.noteId}/view`,
      external: false,
    });
  }

  return NextResponse.json({ error: "No content available" }, { status: 404 });
}
