import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { validateCouponForCart } from "@/lib/coupon";
import { roundMoney } from "@/lib/pricing";

export async function getCartSummary(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { note: true },
    orderBy: { createdAt: "desc" },
  });

  const purchases = await prisma.purchase.findMany({
    where: { userId, noteId: { in: items.map((i) => i.noteId) } },
    select: { noteId: true },
  });
  const owned = new Set(purchases.map((p) => p.noteId));

  const validItems = items.filter((i) => i.note.status === "ACTIVE" && !owned.has(i.noteId));

  let subtotal = 0;
  let noteDiscountTotal = 0;
  const lineItems = validItems.map((item) => {
    const price = decimalToNumber(item.note.price);
    const finalPrice = decimalToNumber(item.note.finalPrice);
    subtotal += price;
    noteDiscountTotal += price - finalPrice;
    return {
      id: item.id,
      noteId: item.noteId,
      title: item.note.title,
      coverImage: item.note.coverImage,
      price,
      finalPrice,
    };
  });

  const merchandiseTotal = roundMoney(
    lineItems.reduce((s, i) => s + i.finalPrice, 0)
  );

  const meta = await prisma.cartMeta.findUnique({ where: { userId } });
  let couponCode: string | null = meta?.couponCode ?? null;
  let couponDiscount = 0;
  let couponError: string | null = null;

  if (couponCode && lineItems.length > 0) {
    const validation = await validateCouponForCart({
      code: couponCode,
      userId,
      noteIds: lineItems.map((l) => l.noteId),
      subtotal: merchandiseTotal,
    });
    if (validation.ok) {
      couponDiscount = validation.couponDiscount;
    } else {
      couponError = validation.message;
      couponCode = null;
      await prisma.cartMeta.upsert({
        where: { userId },
        create: { userId, couponCode: null },
        update: { couponCode: null },
      });
    }
  }

  const total = roundMoney(Math.max(0, merchandiseTotal - couponDiscount));

  return {
    items: lineItems,
    ownedNoteIds: Array.from(owned),
    subtotal: roundMoney(subtotal),
    noteDiscount: roundMoney(noteDiscountTotal),
    merchandiseTotal,
    couponCode,
    couponDiscount,
    couponError,
    total,
  };
}
