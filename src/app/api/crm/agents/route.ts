import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { getCompanyLimits } from "@/lib/crm/limits";
import { z } from "zod";

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const members = await prisma.crmCompanyMember.findMany({
      where: { companyId: session.companyId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      agents: members.map((m) => ({
        id: m.id,
        memberRole: m.memberRole,
        availability: m.availability,
        isActive: m.isActive,
        user: m.user,
      })),
    });
  });
}

const postSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  memberRole: z.enum(["AGENT", "SUPERVISOR"]).default("AGENT"),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember({ adminOnly: true });
    const limits = await getCompanyLimits(session.companyId!);
    if (limits && limits.currentAgents >= limits.maxAgents) {
      return NextResponse.json({ error: "Agent limit reached for subscription plan" }, { status: 403 });
    }

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "AGENT",
      },
    });

    const member = await prisma.crmCompanyMember.create({
      data: {
        companyId: session.companyId!,
        userId: user.id,
        memberRole: parsed.data.memberRole,
      },
    });

    return NextResponse.json({ memberId: member.id, userId: user.id }, { status: 201 });
  });
}
