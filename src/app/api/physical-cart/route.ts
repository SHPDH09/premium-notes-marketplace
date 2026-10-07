import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getPhysicalCartSummary, resolveUnitPriceForCartLine } from "@/lib/physical/cart-server";
import { clampQuantity } from "@/lib/physical/pricing";
import { z } from "zod";
import { BindingType, PaperType, PrintType } from "@prisma/client";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const summary = await getPhysicalCartSummary(auth.session!.user.id);
  return NextResponse.json(summary);
}

const addSchema = z.object({
  physicalDocumentId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  printType: z.nativeEnum(PrintType).optional(),
  paperType: z.nativeEnum(PaperType).optional(),
  bindingType: z.nativeEnum(BindingType).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const doc = await prisma.physicalDocument.findUnique({
    where: { id: parsed.data.physicalDocumentId },
  });
  if (!doc || doc.status !== "ACTIVE") {
    return NextResponse.json({ error: "This document is currently unavailable." }, { status: 404 });
  }

  const printType = parsed.data.printType ?? doc.printType;
  const paperType = parsed.data.paperType ?? doc.paperType;
  const bindingType = parsed.data.bindingType ?? doc.bindingType;
  const quantity = clampQuantity(doc, parsed.data.quantity);
  const unitPrice = await resolveUnitPriceForCartLine(doc.id, printType, paperType, bindingType);

  await prisma.physicalCartItem.upsert({
    where: {
      userId_physicalDocumentId_printType_paperType_bindingType: {
        userId,
        physicalDocumentId: doc.id,
        printType,
        paperType,
        bindingType,
      },
    },
    create: {
      userId,
      physicalDocumentId: doc.id,
      quantity,
      printType,
      paperType,
      bindingType,
      unitPrice,
    },
    update: { quantity, unitPrice },
  });

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const item = await prisma.physicalCartItem.findFirst({
    where: { id: parsed.data.itemId, userId },
    include: { physicalDocument: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const quantity = clampQuantity(item.physicalDocument, parsed.data.quantity);
  await prisma.physicalCartItem.update({
    where: { id: item.id },
    data: { quantity },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await prisma.physicalCartItem.deleteMany({
    where: { id: itemId, userId: auth.session!.user.id },
  });
  return NextResponse.json({ ok: true });
}
