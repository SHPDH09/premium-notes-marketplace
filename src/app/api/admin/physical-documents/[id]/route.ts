import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalDocumentAdmin } from "@/lib/physical/serializers";
import { parsePhysicalDocumentPayload } from "@/lib/physical/admin-document-payload";
import { logAdminAudit } from "@/lib/physical/audit";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const doc = await prisma.physicalDocument.findUnique({
    where: { id: params.id },
    include: { sourceNote: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    document: serializePhysicalDocumentAdmin(doc, doc.sourceNote),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.physicalDocument.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = parsePhysicalDocumentPayload(await req.json());
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error ?? "Invalid payload" }, { status: 400 });
  }
  const p = parsed.data;

  const doc = await prisma.physicalDocument.update({
    where: { id: params.id },
    data: {
      sourceNoteId: p.sourceNoteId ?? null,
      name: p.name,
      title: p.title,
      description: p.description,
      coverStorageKey: p.coverStorageKey ?? existing.coverStorageKey,
      sourcePdfKey: p.sourcePdfKey ?? existing.sourcePdfKey,
      pageCount: p.pageCount ?? existing.pageCount,
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
    action: "update",
    entity: "physical_document",
    entityId: doc.id,
    oldValue: existing.title,
    newValue: doc.title,
  });

  const withNote = await prisma.physicalDocument.findUnique({
    where: { id: params.id },
    include: { sourceNote: true },
  });
  return NextResponse.json({
    document: withNote
      ? serializePhysicalDocumentAdmin(withNote, withNote.sourceNote)
      : serializePhysicalDocumentAdmin(doc),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  await prisma.physicalDocument.delete({ where: { id: params.id } });
  await logAdminAudit({
    adminId: auth.session!.user.id,
    action: "delete",
    entity: "physical_document",
    entityId: params.id,
  });
  return NextResponse.json({ ok: true });
}

/** POST ?action=source-url — admin-only signed PDF */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const doc = await prisma.physicalDocument.findUnique({ where: { id: params.id } });
  if (!doc?.sourcePdfKey) {
    return NextResponse.json({ error: "No source PDF" }, { status: 404 });
  }
  const url = await getSignedDownloadUrl(doc.sourcePdfKey, 600);
  if (!url) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  return NextResponse.json({ url });
}
