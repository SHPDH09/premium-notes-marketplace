import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeUserAdmin, serializePurchase, serializeTransaction } from "@/lib/serializers";
import { hashPassword } from "@/lib/password";
import { decimalToNumber } from "@/lib/utils";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: params.id, role: "STUDENT" },
    include: {
      purchases: { include: { note: true }, orderBy: { purchasedAt: "desc" } },
      transactions: {
        include: { order: { include: { items: { include: { note: true } } } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { purchases: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const spent = await prisma.order.aggregate({
    where: { userId: user.id, paymentStatus: "SUCCESS" },
    _sum: { totalAmount: true },
  });

  return NextResponse.json({
    user: serializeUserAdmin(user),
    totalSpent: decimalToNumber(spent._sum.totalAmount ?? 0),
    purchases: user.purchases.map(serializePurchase),
    transactions: user.transactions.map((t) =>
      serializeTransaction({ ...t, user })
    ),
  });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.email ? { email: parsed.data.email.toLowerCase().trim() } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });

  return NextResponse.json({ user: serializeUserAdmin(user) });
}

const resetSchema = z.object({ password: z.string().min(8) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = resetSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return NextResponse.json({ ok: true });
}
