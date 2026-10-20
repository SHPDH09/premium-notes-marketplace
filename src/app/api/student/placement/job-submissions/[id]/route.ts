import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { formatZodFlatten } from "@/lib/api/format-api-error";
import { jobPostingInputSchema } from "@/lib/placement/job-posting-schema";
import { serializeStudentJobSubmission } from "@/lib/placement/serialize-student-job";
import { isStudentJobSubmissionLocked } from "@/lib/placement/student-job-submission-locked";

async function getOwnedSubmission(userId: string, id: string) {
  return prisma.jobPosting.findFirst({
    where: { id, submittedByUserId: userId, source: "STUDENT" },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const existing = await getOwnedSubmission(auth.session!.user.id, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isStudentJobSubmissionLocked(existing.reviewStatus)) {
    return NextResponse.json(
      { error: "This job is locked after admin approval. You can only view views and apply counts." },
      { status: 403 }
    );
  }
  if (existing.reviewStatus !== "PENDING" && existing.reviewStatus !== "REJECTED") {
    return NextResponse.json({ error: "This posting can no longer be edited" }, { status: 400 });
  }

  const parsed = jobPostingInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodFlatten(parsed.error.flatten()) }, { status: 400 });
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const existing = await getOwnedSubmission(auth.session!.user.id, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isStudentJobSubmissionLocked(existing.reviewStatus)) {
    return NextResponse.json(
      { error: "Approved jobs cannot be deleted. Contact admin if you need changes." },
      { status: 403 }
    );
  }
  await prisma.jobPosting.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
