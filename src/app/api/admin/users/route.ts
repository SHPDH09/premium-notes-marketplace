import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeUserAdmin } from "@/lib/serializers";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { zodErrorMessage } from "@/lib/api/zod-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdminJson(async () => {
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
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  showOnHomepage: z.boolean().optional(),
  homepageInstitute: z.string().optional(),
  homepageHeadline: z.string().optional(),
  homepageQuote: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone?.trim() || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "STUDENT",
      status: parsed.data.status,
    },
  });

  if (parsed.data.showOnHomepage) {
    await prisma.studentSpotlight.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: user.name,
        institute: parsed.data.homepageInstitute?.trim() || null,
        headline: parsed.data.homepageHeadline?.trim() || "Featured Student",
        quote: parsed.data.homepageQuote?.trim() || null,
        photo: user.profileImage,
        status: "ACTIVE",
      },
      update: {
        displayName: user.name,
        institute: parsed.data.homepageInstitute?.trim() || null,
        headline: parsed.data.homepageHeadline?.trim() || "Featured Student",
        quote: parsed.data.homepageQuote?.trim() || null,
        status: "ACTIVE",
      },
    });
  }

  return NextResponse.json(
    { user: serializeUserAdmin({ ...user, _count: { purchases: 0 } }) },
    { status: 201 }
  );
  });
}
