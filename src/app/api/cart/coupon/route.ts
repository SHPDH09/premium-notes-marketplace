import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getCartSummary } from "@/lib/cart-server";
import { validateCouponForCart } from "@/lib/coupon";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1).optional(),
  action: z.enum(["apply", "remove"]),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;
  const userId = auth.session!.user.id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.action === "remove") {
    await prisma.cartMeta.upsert({
      where: { userId },
      create: { userId, couponCode: null },
      update: { couponCode: null },
    });
    const summary = await getCartSummary(userId);
    return NextResponse.json({ ok: true, summary });
  }

  const code = parsed.data.code?.trim();
  if (!code) return NextResponse.json({ error: "Coupon code required" }, { status: 400 });

  const cart = await getCartSummary(userId);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const validation = await validateCouponForCart({
    code,
    userId,
    noteIds: cart.items.map((i) => i.noteId),
    subtotal: cart.merchandiseTotal,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  await prisma.cartMeta.upsert({
    where: { userId },
    create: { userId, couponCode: validation.coupon.code },
    update: { couponCode: validation.coupon.code },
  });

  const summary = await getCartSummary(userId);
  return NextResponse.json({ ok: true, summary });
}
