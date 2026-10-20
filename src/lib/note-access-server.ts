import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isSessionVersionValid } from "@/lib/session-control";
import { ensureNotePreview } from "@/lib/note-preview-server";

export async function studentOwnsNote(userId: string, noteId: string): Promise<boolean> {
  const purchase = await prisma.purchase.findUnique({
    where: { userId_noteId: { userId, noteId } },
  });
  return !!purchase;
}

export async function resolvePurchasedNotePdfKey(
  noteId: string,
  userId: string
): Promise<{ key: string; filename: string } | null> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note?.pdfStorageKey) return null;
  const owned = await studentOwnsNote(userId, noteId);
  if (!owned) return null;
  return { key: note.pdfStorageKey, filename: `note-${note.id}.pdf` };
}

export async function resolvePreviewPdfKey(
  noteId: string
): Promise<{ key: string; filename: string } | null> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return null;
  const meta = await ensureNotePreview(noteId);
  if (!meta) return null;
  return { key: meta.previewKey, filename: `preview-${note.id}.pdf` };
}

export async function requireValidStudentSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return { error: "Unauthorized" as const, status: 401 as const };
  }
  const valid = await isSessionVersionValid(session.user.id, session.user.sessionVersion);
  if (!valid) {
    return { error: "Session expired" as const, status: 401 as const };
  }
  return { session, error: null };
}
