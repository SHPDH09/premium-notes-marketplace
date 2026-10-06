import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getCartSummary } from "@/lib/cart-server";
import { getPublicCoverUrl } from "@/lib/storage";
import { z } from "zod";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const summary = await getCartSummary(auth.session!.user.id);
  return NextResponse.json({
    ...summary,
    items: summary.items.map((i) => ({
      ...i,
      coverImage: getPublicCoverUrl(i.coverImage),
    })),
  });
}

const addSchema = z.object({ noteId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
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

  await prisma.cartItem.upsert({
    where: { userId_noteId: { userId, noteId: note.id } },
    create: { userId, noteId: note.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const noteId = req.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await prisma.cartItem.deleteMany({
    where: { userId: auth.session!.user.id, noteId },
  });
  return NextResponse.json({ ok: true });
}
