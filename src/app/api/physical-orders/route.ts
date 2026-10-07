import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalOrder } from "@/lib/physical/serializers";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const orders = await prisma.physicalOrder.findMany({
    where: { userId: auth.session!.user.id },
    include: { items: true, address: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders: orders.map(serializePhysicalOrder) });
}
