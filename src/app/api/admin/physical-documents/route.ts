import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalDocumentAdmin } from "@/lib/physical/serializers";
import { parsePhysicalDocumentPayload } from "@/lib/physical/admin-document-payload";
import { logAdminAudit } from "@/lib/physical/audit";
import { PublishStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status");

  const docs = await prisma.physicalDocument.findMany({
    include: { sourceNote: true },
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status && status !== "all" ? { status: status as PublishStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: docs.map((d) => serializePhysicalDocumentAdmin(d, d.sourceNote)),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = parsePhysicalDocumentPayload(await req.json());
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error ?? "Invalid payload" }, { status: 400 });
  }
  const p = parsed.data;

  let coverStorageKey = p.coverStorageKey ?? null;
  let sourcePdfKey = p.sourcePdfKey ?? null;
  let pageCount = p.pageCount ?? null;

  if (p.sourceNoteId) {
    const linked = await prisma.note.findUnique({ where: { id: p.sourceNoteId } });
    if (linked) {
      if (!coverStorageKey && linked.coverImage) coverStorageKey = linked.coverImage;
      if (!sourcePdfKey && linked.pdfStorageKey) sourcePdfKey = linked.pdfStorageKey;
      if (pageCount == null && linked.pdfPageCount) pageCount = linked.pdfPageCount;
    }
  }

  const doc = await prisma.physicalDocument.create({
    data: {
      sourceNoteId: p.sourceNoteId ?? null,
      name: p.name,
      title: p.title,
      description: p.description,
      coverStorageKey,
      sourcePdfKey,
      pageCount,
      paperSize: p.paperSize,
      paperType: p.paperType,
      printType: p.printType,
      bindingType: p.bindingType,
      printingCost: p.printingCost,
      bindingCost: p.bindingCost,
      packagingCost: p.packagingCost,
      basePrice: p.basePrice,
      finalPrice: p.finalPrice,
      priceOverride: p.priceOverride,
      minQuantity: p.minQuantity,
      maxQuantity: p.maxQuantity,
      processingDays: p.processingDays,
      status: p.status,
    },
  });

  await logAdminAudit({
    adminId: auth.session!.user.id,
    action: "create",
    entity: "physical_document",
    entityId: doc.id,
    newValue: doc.title,
  });

  const created = await prisma.physicalDocument.findUnique({
    where: { id: doc.id },
    include: { sourceNote: true },
  });
  return NextResponse.json(
    {
      document: created
        ? serializePhysicalDocumentAdmin(created, created.sourceNote)
        : serializePhysicalDocumentAdmin(doc),
    },
    { status: 201 }
  );
}
