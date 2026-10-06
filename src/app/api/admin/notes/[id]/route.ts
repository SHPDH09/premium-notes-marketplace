import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeNoteAdmin } from "@/lib/serializers";
import { calculateFinalPrice } from "@/lib/pricing";
import { deleteStoredFile, uploadFile, validateImageFile, validatePdfFile } from "@/lib/storage";
import { processNotePdfUpload } from "@/lib/process-note-pdf";
import { parseNoteWritePayload } from "@/lib/admin-note-payload";
import { DiscountType, NoteStatus } from "@prisma/client";

export const maxDuration = 60;
export const runtime = "nodejs";

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

  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;

      if (body.status && Object.keys(body).length === 1) {
        const note = await prisma.note.update({
          where: { id: params.id },
          data: { status: body.status as NoteStatus },
        });
        return NextResponse.json({ note: serializeNoteAdmin(note) });
      }

      const parsed = parseNoteWritePayload(body);
      if (parsed.error || !parsed.data) {
        return NextResponse.json({ error: parsed.error ?? "Invalid payload" }, { status: 400 });
      }
      const p = parsed.data;

      let coverKey = existing.coverImage;
      let pdfKey = existing.pdfStorageKey;
      let pdfPreviewKey = existing.pdfPreviewStorageKey;
      let pdfPageCount = existing.pdfPageCount;

      if (p.coverStorageKey) {
        if (existing.coverImage && existing.coverImage !== p.coverStorageKey) {
          await deleteStoredFile(existing.coverImage);
        }
        coverKey = p.coverStorageKey;
      }

      if (p.pdfStorageKey) {
        if (existing.pdfStorageKey) await deleteStoredFile(existing.pdfStorageKey);
        if (existing.pdfPreviewStorageKey) await deleteStoredFile(existing.pdfPreviewStorageKey);
        pdfKey = p.pdfStorageKey;
        pdfPreviewKey = null;
        pdfPageCount = null;
      }

      const notesLink = p.notesLink ?? existing.notesLink;

      if (!pdfKey && !notesLink) {
        return NextResponse.json({ error: "PDF or external link required" }, { status: 400 });
      }

      const finalPrice = calculateFinalPrice(p.price, p.discountType, p.discountValue);

      const note = await prisma.note.update({
        where: { id: params.id },
        data: {
          name: p.name,
          title: p.title,
          description: p.description,
          coverImage: coverKey,
          pdfStorageKey: pdfKey,
          pdfPreviewStorageKey: pdfPreviewKey,
          freePreviewPages: p.freePreviewPages,
          pdfPageCount,
          notesLink,
          price: p.price,
          discountType: p.discountType,
          discountValue: p.discountValue,
          finalPrice,
          status: p.status,
        },
      });

      return NextResponse.json({ note: serializeNoteAdmin(note) });
    }

    const form = await req.formData();
    const name = String(form.get("name") ?? existing.name).trim();
    const title = String(form.get("title") ?? existing.title).trim();
    const description = String(form.get("description") ?? existing.description).trim();
    const notesLinkRaw = form.get("notesLink");
    const notesLink =
      notesLinkRaw === null ? existing.notesLink : String(notesLinkRaw).trim() || null;
    const price = parseFloat(String(form.get("price") ?? existing.price.toString()));
    const discountType = String(form.get("discountType") ?? existing.discountType) as DiscountType;
    const discountValue = parseFloat(String(form.get("discountValue") ?? existing.discountValue.toString()));
    const status = String(form.get("status") ?? existing.status) as NoteStatus;
    const freePreviewPages =
      parseInt(String(form.get("freePreviewPages") ?? existing.freePreviewPages ?? "2"), 10) || 2;

    let coverKey = existing.coverImage;
    let pdfKey = existing.pdfStorageKey;
    let pdfPreviewKey = existing.pdfPreviewStorageKey;
    let pdfPageCount = existing.pdfPageCount;

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
      if (existing.pdfStorageKey) await deleteStoredFile(existing.pdfStorageKey);
      if (existing.pdfPreviewStorageKey) await deleteStoredFile(existing.pdfPreviewStorageKey);
      const processed = await processNotePdfUpload(buf);
      if ("error" in processed) return NextResponse.json({ error: processed.error }, { status: 500 });
      pdfKey = processed.fullKey;
      pdfPreviewKey = null;
      pdfPageCount = null;
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
        pdfPreviewStorageKey: pdfPreviewKey,
        freePreviewPages,
        pdfPageCount,
        notesLink,
        price,
        discountType,
        discountValue,
        finalPrice,
        status,
      },
    });

    return NextResponse.json({ note: serializeNoteAdmin(note) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update note";
    console.error("admin notes PATCH", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id: params.id } });
  if (note.coverImage) await deleteStoredFile(note.coverImage);
  if (note.pdfStorageKey) await deleteStoredFile(note.pdfStorageKey);
  if (note.pdfPreviewStorageKey) await deleteStoredFile(note.pdfPreviewStorageKey);

  return NextResponse.json({ ok: true });
}
