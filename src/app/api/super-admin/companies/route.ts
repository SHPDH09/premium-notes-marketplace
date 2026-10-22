import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const rows = await prisma.crmCompany.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptionPlan: true,
        _count: { select: { members: true, whatsappAccounts: true, conversations: true } },
      },
    });
    return NextResponse.json({
      companies: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        plan: c.subscriptionPlan?.name ?? null,
        expiresAt: c.subscriptionExpiresAt?.toISOString() ?? null,
        members: c._count.members,
        numbers: c._count.whatsappAccounts,
        conversations: c._count.conversations,
      })),
    });
  });
}

const postSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  planId: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.adminEmail.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "Admin email already exists" }, { status: 409 });
    }
    if (await prisma.crmCompany.findUnique({ where: { slug: parsed.data.slug } })) {
      return NextResponse.json({ error: "Slug taken" }, { status: 409 });
    }

    const planId =
      parsed.data.planId ??
      (await prisma.crmSubscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }))
        ?.id;

    const company = await prisma.crmCompany.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        subscriptionPlanId: planId,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: parsed.data.adminName,
        email,
        passwordHash: await hashPassword(parsed.data.adminPassword),
        role: "COMPANY_ADMIN",
      },
    });

    await prisma.crmCompanyMember.create({
      data: {
        companyId: company.id,
        userId: user.id,
        memberRole: "COMPANY_ADMIN",
      },
    });

    return NextResponse.json({ companyId: company.id }, { status: 201 });
  });
}
