import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeNoteAdmin } from "@/lib/serializers";
import { calculateFinalPrice } from "@/lib/pricing";
import { uploadFile, validateImageFile, validatePdfFile } from "@/lib/storage";
import { processNotePdfUpload } from "@/lib/process-note-pdf";
import { parseNoteWritePayload } from "@/lib/admin-note-payload";
import { NoteStatus } from "@prisma/client";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status");

  const notes = await prisma.note.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status && status !== "all" ? { status: status as NoteStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notes: notes.map(serializeNoteAdmin) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      const parsed = parseNoteWritePayload(body);
      if (parsed.error || !parsed.data) {
        return NextResponse.json({ error: parsed.error ?? "Invalid payload" }, { status: 400 });
      }
      const p = parsed.data;

      if (!p.pdfStorageKey && !p.notesLink) {
        return NextResponse.json(
          { error: "Upload a PDF or provide an external notes link." },
          { status: 400 }
        );
      }

      const finalPrice = calculateFinalPrice(p.price, p.discountType, p.discountValue);

      const note = await prisma.note.create({
        data: {
          name: p.name,
          title: p.title,
          description: p.description,
          coverImage: p.coverStorageKey,
          pdfStorageKey: p.pdfStorageKey,
          freePreviewPages: p.freePreviewPages,
          notesLink: p.notesLink,
          price: p.price,
          discountType: p.discountType,
          discountValue: p.discountValue,
          finalPrice,
          status: p.status,
        },
      });

      return NextResponse.json({ note: serializeNoteAdmin(note) }, { status: 201 });
    }

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const notesLink = String(form.get("notesLink") ?? "").trim() || null;
    const price = parseFloat(String(form.get("price") ?? "0"));
    const discountType = String(form.get("discountType") ?? "PERCENTAGE") as import("@prisma/client").DiscountType;
    const discountValue = parseFloat(String(form.get("discountValue") ?? "0"));
    const status = String(form.get("status") ?? "ACTIVE") as NoteStatus;
    const freePreviewPages = parseInt(String(form.get("freePreviewPages") ?? "2"), 10) || 2;

    if (!name || !title || !description || Number.isNaN(price)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let coverKey: string | null = null;
    let pdfKey: string | null = null;

    const cover = form.get("cover");
    const pdf = form.get("pdf");

    if (cover instanceof File && cover.size > 0) {
      const err = validateImageFile(cover);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      const buf = Buffer.from(await cover.arrayBuffer());
      const uploaded = await uploadFile(buf, cover.type, "covers");
      if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
      coverKey = uploaded.key;
    }

    if (pdf instanceof File && pdf.size > 0) {
      const err = validatePdfFile(pdf);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      const buf = Buffer.from(await pdf.arrayBuffer());
      const processed = await processNotePdfUpload(buf);
      if ("error" in processed) return NextResponse.json({ error: processed.error }, { status: 500 });
      pdfKey = processed.fullKey;
    }

    if (!pdfKey && !notesLink) {
      return NextResponse.json({ error: "Upload a PDF or provide an external notes link." }, { status: 400 });
    }

    const finalPrice = calculateFinalPrice(price, discountType, discountValue);

    const note = await prisma.note.create({
      data: {
        name,
        title,
        description,
        coverImage: coverKey,
        pdfStorageKey: pdfKey,
        freePreviewPages,
        notesLink,
        price,
        discountType,
        discountValue,
        finalPrice,
        status,
      },
    });

    return NextResponse.json({ note: serializeNoteAdmin(note) }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save note";
    console.error("admin notes POST", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
