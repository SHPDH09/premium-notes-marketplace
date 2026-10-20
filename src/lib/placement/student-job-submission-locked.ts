import type { JobReviewStatus } from "@prisma/client";

/** After admin approval (or live verify), student cannot edit or delete — view stats only. */
export function isStudentJobSubmissionLocked(reviewStatus: JobReviewStatus | string): boolean {
  return reviewStatus === "APPROVED" || reviewStatus === "VERIFIED";
}
