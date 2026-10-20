import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { jobPostingInputSchema } from "@/lib/placement/job-posting-schema";
import { serializeStudentJobSubmission } from "@/lib/placement/serialize-student-job";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const existing = await prisma.jobPosting.findFirst({
    where: {
      id: params.id,
      submittedByUserId: auth.session!.user.id,
      source: "STUDENT",
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!["PENDING", "REJECTED"].includes(existing.reviewStatus)) {
    return NextResponse.json({ error: "This posting can no longer be edited" }, { status: 400 });
  }

  const parsed = jobPostingInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const job = await prisma.jobPosting.update({
    where: { id: existing.id },
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
      reviewStatus: "PENDING",
      adminReviewNote: null,
    },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({ job: serializeStudentJobSubmission(job) });
}
