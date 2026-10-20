import { prisma } from "@/lib/db";

/** Active job visible on the public placement board (for share previews / landing). */
export async function getActiveJobPosting(jobId: string) {
  return prisma.jobPosting.findFirst({
    where: { id: jobId, status: "ACTIVE" },
  });
}
