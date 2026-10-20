import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { jobPostingInputSchema } from "@/lib/placement/job-posting-schema";
import { serializeJobPosting } from "@/lib/placement/serialize";

const actionSchema = z.object({
  action: z.enum(["approve", "verify", "reject", "save"]),
  adminReviewNote: z.string().nullable().optional(),
  job: jobPostingInputSchema.optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.jobPosting.findFirst({
      where: { id: params.id, source: "STUDENT" },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { action, adminReviewNote, job: jobInput } = parsed.data;

    if (action === "save" || action === "approve" || action === "verify") {
      if (!jobInput) {
        return NextResponse.json({ error: "Job fields required" }, { status: 400 });
      }
    }

    let data: Record<string, unknown> = {};

    if (jobInput) {
      data = {
        title: jobInput.title,
        company: jobInput.company,
        location: jobInput.location ?? null,
        applyType: jobInput.applyType,
        description: jobInput.description,
        applyEmail: jobInput.applyEmail ?? null,
        applyUrl: jobInput.applyUrl ?? null,
        applyPhone: jobInput.applyPhone?.trim() ?? null,
        walkInDetails: jobInput.walkInDetails ?? null,
        requiresSubscription: jobInput.requiresSubscription ?? true,
        sortOrder: jobInput.sortOrder ?? existing.sortOrder,
      };
    }

    if (action === "approve") {
      data.reviewStatus = "APPROVED";
      data.status = "DISABLED";
      data.adminReviewNote = adminReviewNote ?? null;
    } else if (action === "verify") {
      data.reviewStatus = "VERIFIED";
      data.status = "ACTIVE";
      data.adminReviewNote = adminReviewNote ?? null;
    } else if (action === "reject") {
      data.reviewStatus = "REJECTED";
      data.status = "DISABLED";
      data.adminReviewNote = adminReviewNote ?? "Rejected by admin";
    }

    const job = await prisma.jobPosting.update({
      where: { id: existing.id },
      data,
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { applications: true } },
      },
    });

    return NextResponse.json({
      job: {
        ...serializeJobPosting(job),
        applyCount: job._count.applications,
        submittedBy: job.submittedBy,
      },
    });
  });
}
