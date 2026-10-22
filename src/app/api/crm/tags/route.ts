import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import { prisma } from "@/lib/db";

const DEFAULT_TAGS = [
  { name: "New Lead", color: "#3b82f6" },
  { name: "Interested", color: "#22c55e" },
  { name: "Follow-up Required", color: "#f59e0b" },
  { name: "Customer", color: "#059669" },
  { name: "Student", color: "#8b5cf6" },
  { name: "Priority", color: "#ef4444" },
  { name: "Not Interested", color: "#64748b" },
  { name: "Do Not Contact", color: "#1e293b" },
];

async function ensureDefaultTags(companyId: string) {
  const count = await prisma.crmTag.count({ where: { companyId } });
  if (count > 0) return;
  await prisma.crmTag.createMany({
    data: DEFAULT_TAGS.map((t) => ({ companyId, name: t.name, color: t.color })),
  });
}

export async function GET() {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    await ensureDefaultTags(session.companyId);
    const tags = await prisma.crmTag.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ tags });
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const tag = await prisma.crmTag.create({
      data: {
        companyId: session.companyId,
        name: body.name.trim(),
        color: body.color ?? "#16a34a",
      },
    });
    return NextResponse.json({ tag }, { status: 201 });
  });
}
