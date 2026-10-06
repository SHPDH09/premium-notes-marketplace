import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeNoteAdmin } from "@/lib/serializers";
import { calculateFinalPrice } from "@/lib/pricing";
import { deleteStoredFile, uploadFile, validateImageFile, validatePdfFile } from "@/lib/storage";
import { DiscountType, NoteStatus } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note: serializeNoteAdmin(note) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.note.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { status?: NoteStatus };
    if (body.status) {
      const note = await prisma.note.update({
        where: { id: params.id },
        data: { status: body.status },
      });
      return NextResponse.json({ note: serializeNoteAdmin(note) });
    }
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? existing.name).trim();
  const title = String(form.get("title") ?? existing.title).trim();
  const description = String(form.get("description") ?? existing.description).trim();
  const notesLinkRaw = form.get("notesLink");
  const notesLink =
    notesLinkRaw === null
      ? existing.notesLink
      : String(notesLinkRaw).trim() || null;
  const price = parseFloat(String(form.get("price") ?? existing.price.toString()));
  const discountType = String(form.get("discountType") ?? existing.discountType) as DiscountType;
  const discountValue = parseFloat(String(form.get("discountValue") ?? existing.discountValue.toString()));
  const status = String(form.get("status") ?? existing.status) as NoteStatus;

  let coverKey = existing.coverImage;
  let pdfKey = existing.pdfStorageKey;

  const cover = form.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const err = validateImageFile(cover);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await cover.arrayBuffer());
    const uploaded = await uploadFile(buf, cover.type, "covers");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    if (existing.coverImage) await deleteStoredFile(existing.coverImage);
    coverKey = uploaded.key;
  }

  const pdf = form.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    const err = validatePdfFile(pdf);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await pdf.arrayBuffer());
    const uploaded = await uploadFile(buf, pdf.type, "pdfs");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    if (existing.pdfStorageKey) await deleteStoredFile(existing.pdfStorageKey);
    pdfKey = uploaded.key;
  }

  if (!pdfKey && !notesLink) {
    return NextResponse.json({ error: "PDF or external link required" }, { status: 400 });
  }

  const finalPrice = calculateFinalPrice(price, discountType, discountValue);

  const note = await prisma.note.update({
    where: { id: params.id },
    data: {
      name,
      title,
      description,
      coverImage: coverKey,
      pdfStorageKey: pdfKey,
      notesLink,
      price,
      discountType,
      discountValue,
      finalPrice,
      status,
    },
  });

  return NextResponse.json({ note: serializeNoteAdmin(note) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id: params.id } });
  if (note.coverImage) await deleteStoredFile(note.coverImage);
  if (note.pdfStorageKey) await deleteStoredFile(note.pdfStorageKey);

  return NextResponse.json({ ok: true });
}
