import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getPhysicalCartSummary } from "@/lib/physical/cart-server";
import { validateCouponForPhysicalCart } from "@/lib/physical/coupon";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["apply", "remove"]),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (parsed.data.action === "remove") {
    await prisma.physicalCartMeta.upsert({
      where: { userId },
      create: { userId, couponCode: null },
      update: { couponCode: null },
    });
    const summary = await getPhysicalCartSummary(userId);
    return NextResponse.json({ summary });
  }

  const code = parsed.data.code?.trim();
  if (!code) return NextResponse.json({ error: "Coupon code required" }, { status: 400 });

  const summary = await getPhysicalCartSummary(userId);
  if (summary.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const validation = await validateCouponForPhysicalCart({
    code,
    userId,
    documentIds: summary.items.map((i) => i.physicalDocumentId),
    subtotal: summary.subtotal,
  });
  if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

  await prisma.physicalCartMeta.upsert({
    where: { userId },
    create: { userId, couponCode: code.toUpperCase() },
    update: { couponCode: code.toUpperCase() },
  });

  const updated = await getPhysicalCartSummary(userId);
  return NextResponse.json({ summary: updated });
}
