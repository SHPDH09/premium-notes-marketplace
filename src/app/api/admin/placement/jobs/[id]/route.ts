import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { serializeJobPosting } from "@/lib/placement/serialize";
import { JobApplyType, PublishStatus } from "@prisma/client";

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  company: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  applyType: z.nativeEnum(JobApplyType).optional(),
  description: z.string().min(10).optional(),
  applyEmail: z.string().email().nullable().optional(),
  applyUrl: z.string().url().nullable().optional(),
  applyPhone: z.string().min(8).max(20).nullable().optional(),
  walkInDetails: z.string().nullable().optional(),
  requiresSubscription: z.boolean().optional(),
  status: z.nativeEnum(PublishStatus).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const job = await prisma.jobPosting.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ job: serializeJobPosting(job) });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    await prisma.jobPosting.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
