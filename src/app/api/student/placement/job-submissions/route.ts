import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { formatZodFlatten } from "@/lib/api/format-api-error";
import { jobPostingInputSchema } from "@/lib/placement/job-posting-schema";
import { serializeStudentJobSubmission } from "@/lib/placement/serialize-student-job";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const jobs = await prisma.jobPosting.findMany({
    where: { submittedByUserId: auth.session!.user.id, source: "STUDENT" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({ jobs: jobs.map(serializeStudentJobSubmission) });
}

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  if (!(await userHasActivePlacementSubscription(userId))) {
    return NextResponse.json({ error: "Placement subscription required to post jobs" }, { status: 403 });
  }

  const parsed = jobPostingInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodFlatten(parsed.error.flatten()) }, { status: 400 });
  }

  const d = parsed.data;
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
      sortOrder: d.sortOrder ?? 0,
      source: "STUDENT",
      reviewStatus: "PENDING",
      status: "DISABLED",
      submittedByUserId: userId,
    },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({ job: serializeStudentJobSubmission(job) }, { status: 201 });
}
