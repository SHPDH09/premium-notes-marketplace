import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeUserAddress } from "@/lib/physical/serializers";
import { validateIndianPincode, validateIndianPhone, normalizePhone } from "@/lib/physical/validation";
import { z } from "zod";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const rows = await prisma.userAddress.findMany({
    where: { userId: auth.session!.user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ addresses: rows.map(serializeUserAddress) });
}

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

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const parsed = addressSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  const d = parsed.data;
  if (!validateIndianPincode(d.pincode) || !validateIndianPhone(d.phone)) {
    return NextResponse.json({ error: "Invalid phone or pincode" }, { status: 400 });
  }

  if (d.isDefault) {
    await prisma.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const created = await prisma.userAddress.create({
    data: {
      userId,
      fullName: d.fullName.trim(),
      phone: normalizePhone(d.phone),
      addressLine1: d.addressLine1.trim(),
      addressLine2: d.addressLine2?.trim(),
      landmark: d.landmark?.trim(),
      city: d.city.trim(),
      state: d.state.trim(),
      pincode: d.pincode.trim(),
      country: d.country || "India",
      isDefault: d.isDefault ?? false,
    },
  });

  return NextResponse.json({ address: serializeUserAddress(created) }, { status: 201 });
}
