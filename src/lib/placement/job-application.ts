import { JobApplicationChannel } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Records first apply time only; repeats do not change appliedAt. */
export async function recordJobApplication(
  userId: string,
  jobId: string,
  channel: JobApplicationChannel
) {
  const existing = await prisma.jobApplication.findUnique({
    where: { userId_jobId: { userId, jobId } },
  });
  if (existing) return existing;

  return prisma.jobApplication.create({
    data: { userId, jobId, channel },
  });
}
