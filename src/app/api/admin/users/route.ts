import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeUserAdmin } from "@/lib/serializers";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { purchases: true } } },
    orderBy: { createdAt: "desc" },
  });

  const spending = await prisma.order.groupBy({
    by: ["userId"],
    where: { paymentStatus: "SUCCESS", userId: { in: users.map((u) => u.id) } },
    _sum: { totalAmount: true },
  });
  const spendMap = new Map(spending.map((s) => [s.userId, s._sum.totalAmount]));

  return NextResponse.json({
    users: users.map((u) => ({
      ...serializeUserAdmin(u),
      totalSpent: spendMap.get(u.id)?.toString() ?? "0",
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email exists" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone?.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "STUDENT",
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ user: serializeUserAdmin(user) }, { status: 201 });
}
