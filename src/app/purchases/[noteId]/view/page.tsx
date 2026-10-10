import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isSessionVersionValid } from "@/lib/session-control";
import { prisma } from "@/lib/db";
import { StudentShell } from "@/components/layout/student-shell";
import { SecureNoteViewer } from "@/components/notes/secure-note-viewer";
import { Button } from "@/components/ui/button";

export default async function PurchasedNoteViewPage({
  params,
}: {
  params: { noteId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect(`/login?callbackUrl=/purchases/${params.noteId}/view`);
  }

  const valid = await isSessionVersionValid(session.user.id, session.user.sessionVersion);
  if (!valid) {
    redirect("/login?reason=session_superseded");
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_noteId: { userId: session.user.id, noteId: params.noteId } },
    include: { note: true },
  });

  if (!purchase) {
    redirect("/purchases");
  }

  const note = purchase.note;
  const watermark = `${session.user.email} · ${session.user.name}`;

  return (
    <StudentShell>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{note.title}</h1>
            <p className="text-sm text-slate-500">Protected view — dashboard access only</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/purchases">Back to purchases</Link>
          </Button>
        </div>

        {note.notesLink ? (
          <div
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={{ userSelect: "none" }}
          >
            <iframe
              title={note.title}
              src={note.notesLink}
              className="h-[min(80vh,720px)] w-full"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
            />
            <p className="border-t px-3 py-2 text-center text-xs text-slate-500">
              External notes open inside your account only. Do not share this login.
            </p>
          </div>
        ) : note.pdfStorageKey ? (
          <SecureNoteViewer
            streamUrl={`/api/purchases/${params.noteId}/stream`}
            watermark={watermark}
            title={note.title}
          />
        ) : (
          <p className="text-slate-500">No content available for this note.</p>
        )}
      </div>
    </StudentShell>
  );
}
