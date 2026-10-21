import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { serializeJobPosting } from "@/lib/placement/serialize";
import { scheduleWhatsAppChannelPublish } from "@/lib/whatsapp-channel/publish-job";
import { JobApplyType, PublishStatus } from "@prisma/client";

export async function GET() {
  return withAdminJson(async () => {
    const jobs = await prisma.jobPosting.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ jobs: jobs.map(serializeJobPosting) });
  });
}

const createSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(1),
  location: z.string().nullable().optional(),
  applyType: z.nativeEnum(JobApplyType),
  description: z.string().min(10),
  applyEmail: z.string().email().nullable().optional(),
  applyUrl: z.string().url().nullable().optional(),
  applyPhone: z.string().min(8).max(32).nullable().optional(),
  walkInDetails: z.string().nullable().optional(),
  requiresSubscription: z.boolean().optional(),
  status: z.nativeEnum(PublishStatus).optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  return withAdminJson(async () => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    if (d.applyType === "EMAIL" && !d.applyEmail) {
      return NextResponse.json({ error: "Apply email is required for email jobs" }, { status: 400 });
    }
    if (d.applyType === "LINK" && !d.applyUrl) {
      return NextResponse.json({ error: "Apply URL is required for link jobs" }, { status: 400 });
    }
    if (d.applyType === "WALK_IN" && !d.walkInDetails?.trim()) {
      return NextResponse.json({ error: "Walk-in details are required" }, { status: 400 });
    }
    if ((d.applyType === "CALL" || d.applyType === "WHATSAPP") && !d.applyPhone?.trim()) {
      return NextResponse.json({ error: "Phone / WhatsApp number is required" }, { status: 400 });
    }

    const status = d.status ?? "ACTIVE";
    const job = await prisma.jobPosting.create({
      data: {
        title: d.title,
        company: d.company,
        location: d.location ?? null,
        applyType: d.applyType,
        description: d.description,
        applyEmail: d.applyEmail ?? null,
        applyUrl: d.applyUrl ?? null,
        applyPhone: d.applyPhone?.trim() ?? null,
        walkInDetails: d.walkInDetails ?? null,
        requiresSubscription: d.requiresSubscription ?? true,
        status,
        source: "ADMIN",
        reviewStatus: "NONE",
        sortOrder: d.sortOrder ?? 0,
      },
    });
    if (status === "ACTIVE") {
      scheduleWhatsAppChannelPublish(job.id);
    }
    return NextResponse.json({ job: serializeJobPosting(job) }, { status: 201 });
  });
}
