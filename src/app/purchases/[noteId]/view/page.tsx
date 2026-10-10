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

        {note.pdfStorageKey ? (
          <SecureNoteViewer
            streamUrl={`/api/purchases/${params.noteId}/stream`}
            watermark={watermark}
            title={note.title}
          />
        ) : note.notesLink ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            <p className="font-semibold">PDF viewer not available for this note</p>
            <p className="mt-2 text-amber-900/90">
              This listing uses an external link that cannot be shown inside the dashboard (the other
              site blocks embedding). For protected in-app viewing, the admin should attach a PDF file
              to this note in the admin panel.
            </p>
          </div>
        ) : (
          <p className="text-slate-500">No content available for this note.</p>
        )}
      </div>
    </StudentShell>
  );
}
