import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const company = await prisma.crmCompany.findUnique({
      where: { id: ctx.params.id },
      include: {
        subscriptionPlan: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        whatsappAccounts: { select: { id: true, label: true, status: true, phoneE164: true } },
        _count: { select: { conversations: true, contacts: true } },
      },
    });
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [messagesInbound, messagesOutbound, messagesTotal] = await Promise.all([
      prisma.crmMessage.count({
        where: { conversation: { companyId: company.id }, direction: "INBOUND" },
      }),
      prisma.crmMessage.count({
        where: { conversation: { companyId: company.id }, direction: "OUTBOUND" },
      }),
      prisma.crmMessage.count({
        where: { conversation: { companyId: company.id } },
      }),
    ]);

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        brandColor: company.brandColor,
        logoUrl: company.logoUrl,
        planId: company.subscriptionPlanId,
        planName: company.subscriptionPlan?.name ?? null,
        expiresAt: company.subscriptionExpiresAt?.toISOString() ?? null,
        createdAt: company.createdAt.toISOString(),
        stats: {
          agents: company.members.length,
          activeAgents: company.members.filter((m) => m.isActive).length,
          whatsappNumbers: company.whatsappAccounts.length,
          conversations: company._count.conversations,
          contacts: company._count.contacts,
          messagesInbound,
          messagesOutbound,
          messagesTotal,
        },
        members: company.members.map((m) => ({
          id: m.id,
          memberRole: m.memberRole,
          isActive: m.isActive,
          availability: m.availability,
          user: m.user,
        })),
        whatsappAccounts: company.whatsappAccounts,
      },
    });
  });
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  subscriptionPlanId: z.string().cuid().nullable().optional(),
  subscriptionExpiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.crmCompany.findUnique({ where: { id: ctx.params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const clash = await prisma.crmCompany.findUnique({ where: { slug: parsed.data.slug } });
      if (clash) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      }
    }

    const updated = await prisma.crmCompany.update({
      where: { id: ctx.params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.subscriptionPlanId !== undefined
          ? { subscriptionPlanId: parsed.data.subscriptionPlanId }
          : {}),
        ...(parsed.data.subscriptionExpiresAt !== undefined
          ? {
              subscriptionExpiresAt: parsed.data.subscriptionExpiresAt
                ? new Date(parsed.data.subscriptionExpiresAt)
                : null,
            }
          : {}),
      },
    });

    return NextResponse.json({ company: { id: updated.id, name: updated.name, status: updated.status } });
  });
}
