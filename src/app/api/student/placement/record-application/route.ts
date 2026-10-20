import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { JobApplicationChannel } from "@prisma/client";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { recordJobApplication } from "@/lib/placement/job-application";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";

const schema = z.object({
  jobId: z.string().min(1),
  channel: z.nativeEnum(JobApplicationChannel),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  if (!(await userHasActivePlacementSubscription(userId))) {
    return NextResponse.json({ error: "Placement subscription required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const job = await prisma.jobPosting.findFirst({
    where: { id: parsed.data.jobId, status: "ACTIVE" },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const row = await recordJobApplication(userId, parsed.data.jobId, parsed.data.channel);

  return NextResponse.json({
    ok: true,
    appliedAt: row.appliedAt.toISOString(),
    channel: row.channel,
  });
}
