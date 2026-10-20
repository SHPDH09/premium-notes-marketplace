import { NextRequest } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { resolvePurchasedNotePdfKey } from "@/lib/note-access-server";
import { downloadStoredFile } from "@/lib/storage";
import { pdfStreamResponse } from "@/lib/pdf-stream-response";

export async function GET(_req: NextRequest, { params }: { params: { noteId: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const resolved = await resolvePurchasedNotePdfKey(params.noteId, auth.session!.user.id);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Purchase required" }), { status: 403 });
  }

  const pdf = await downloadStoredFile(resolved.key);
  if (!pdf) {
    return new Response(JSON.stringify({ error: "File unavailable" }), { status: 503 });
  }

  return pdfStreamResponse(pdf, resolved.filename);
}
