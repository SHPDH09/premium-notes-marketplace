import type { JobPosting, Prisma } from "@prisma/client";

/** Jobs shown on the public placement board. */
export const publicJobBoardWhere: Prisma.JobPostingWhereInput = {
  status: "ACTIVE",
  OR: [{ source: "ADMIN" }, { reviewStatus: "VERIFIED" }],
};

export function isJobLiveOnPublicBoard(
  job: Pick<JobPosting, "status" | "source" | "reviewStatus">
): boolean {
  if (job.status !== "ACTIVE") return false;
  if (job.source === "ADMIN") return true;
  return job.reviewStatus === "VERIFIED";
}
