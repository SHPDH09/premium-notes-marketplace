import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isSessionVersionValid } from "@/lib/session-control";
import {
  resolvePreviewPdfKey,
  resolvePurchasedNotePdfKey,
  studentOwnsNote,
} from "@/lib/note-access-server";
import { downloadStoredFile } from "@/lib/storage";
import { pdfStreamResponse } from "@/lib/pdf-stream-response";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note || note.status !== "ACTIVE") {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (
    session?.user?.role === "STUDENT" &&
    (await isSessionVersionValid(session.user.id, session.user.sessionVersion)) &&
    (await studentOwnsNote(session.user.id, params.id))
  ) {
    const full = await resolvePurchasedNotePdfKey(params.id, session.user.id);
    if (full) {
      const pdf = await downloadStoredFile(full.key);
      if (pdf) return pdfStreamResponse(pdf, full.filename);
    }
  }

  const preview = await resolvePreviewPdfKey(params.id);
  if (!preview) {
    return new Response(JSON.stringify({ error: "Preview unavailable" }), { status: 503 });
  }

  const pdf = await downloadStoredFile(preview.key);
  if (!pdf) {
    return new Response(JSON.stringify({ error: "Preview unavailable" }), { status: 503 });
  }

  return pdfStreamResponse(pdf, preview.filename);
}
