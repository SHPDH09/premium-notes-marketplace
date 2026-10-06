import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { zodErrorMessage } from "@/lib/api/zod-error";

const schema = z.object({ noteId: z.string().min(1) });

/** Replace cart with a single note (Buy Now — skip cart UI). */
export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const note = await prisma.note.findUnique({ where: { id: parsed.data.noteId } });
  if (!note || note.status !== "ACTIVE") {
    return NextResponse.json({ error: "Note not available" }, { status: 404 });
  }

  const owned = await prisma.purchase.findUnique({
    where: { userId_noteId: { userId, noteId: note.id } },
  });
  if (owned) {
    return NextResponse.json({ error: "You already purchased this note." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.cartItem.create({ data: { userId, noteId: note.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
