import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeUserAddress } from "@/lib/physical/serializers";
import { validateIndianPincode, validateIndianPhone, normalizePhone } from "@/lib/physical/validation";
import { z } from "zod";

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(6).max(6),
  country: z.string().default("India"),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const existing = await prisma.userAddress.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = addressSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  const d = parsed.data;
  if (!validateIndianPincode(d.pincode) || !validateIndianPhone(d.phone)) {
    return NextResponse.json({ error: "Invalid phone or pincode" }, { status: 400 });
  }

  if (d.isDefault) {
    await prisma.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const updated = await prisma.userAddress.update({
    where: { id: existing.id },
    data: {
      fullName: d.fullName.trim(),
      phone: normalizePhone(d.phone),
      addressLine1: d.addressLine1.trim(),
      addressLine2: d.addressLine2?.trim(),
      landmark: d.landmark?.trim(),
      city: d.city.trim(),
      state: d.state.trim(),
      pincode: d.pincode.trim(),
      country: d.country || "India",
      isDefault: d.isDefault ?? existing.isDefault,
    },
  });

  return NextResponse.json({ address: serializeUserAddress(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const existing = await prisma.userAddress.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.userAddress.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
