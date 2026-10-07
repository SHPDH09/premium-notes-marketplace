import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { createPhysicalCheckoutOrder } from "@/lib/physical/orders";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  acceptedLegal: z.literal(true),
  idempotencyKey: z.string().optional(),
  addressId: z.string().optional(),
  address: z
    .object({
      fullName: z.string().min(2),
      phone: z.string().min(10),
      altPhone: z.string().optional(),
      addressLine1: z.string().min(3),
      addressLine2: z.string().optional(),
      landmark: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(6).max(6),
      country: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.session!.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let addressInput = parsed.data.address;
  if (parsed.data.addressId) {
    const saved = await prisma.userAddress.findFirst({
      where: { id: parsed.data.addressId, userId: user.id },
    });
    if (!saved) return NextResponse.json({ error: "Address not found" }, { status: 404 });
    addressInput = {
      fullName: saved.fullName,
      phone: saved.phone,
      addressLine1: saved.addressLine1,
      addressLine2: saved.addressLine2 ?? undefined,
      landmark: saved.landmark ?? undefined,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
      country: saved.country,
    };
  }

  if (!addressInput) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  try {
    const result = await createPhysicalCheckoutOrder({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      address: addressInput,
      addressId: parsed.data.addressId,
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
      acceptedLegal: true,
    });

    if ("existing" in result && result.existing) {
      return NextResponse.json({
        physicalOrderId: result.physicalOrderId,
        orderNumber: result.orderNumber,
        existing: true,
      });
    }

    if ("free" in result && result.free) {
      return NextResponse.json({
        physicalOrderId: result.physicalOrderId,
        orderNumber: result.orderNumber,
        free: true,
      });
    }

    return NextResponse.json({
      physicalOrderId: result.physicalOrderId,
      orderNumber: result.orderNumber,
      paymentSessionId: result.paymentSessionId,
      free: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to place order. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
