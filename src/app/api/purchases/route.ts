import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePurchase } from "@/lib/serializers";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const purchases = await prisma.purchase.findMany({
    where: { userId: auth.session!.user.id },
    include: { note: true },
    orderBy: { purchasedAt: "desc" },
  });

  return NextResponse.json({ purchases: purchases.map(serializePurchase) });
}
