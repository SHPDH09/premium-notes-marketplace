import type { JobPosting } from "@prisma/client";
import { jobPostedAt } from "@/lib/placement/job-posted-at";
import { isStudentJobSubmissionLocked } from "@/lib/placement/student-job-submission-locked";

type JobWithCounts = JobPosting & {
  _count?: { applications: number };
};

export function serializeStudentJobSubmission(job: JobWithCounts) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    applyType: job.applyType,
    description: job.description,
    applyEmail: job.applyEmail,
    applyUrl: job.applyUrl,
    applyPhone: job.applyPhone,
    walkInDetails: job.walkInDetails,
    requiresSubscription: job.requiresSubscription,
    reviewStatus: job.reviewStatus,
    locked: isStudentJobSubmissionLocked(job.reviewStatus),
    adminReviewNote: job.adminReviewNote,
    viewCount: job.viewCount,
    applyCount: job._count?.applications ?? 0,
    createdAt: job.createdAt.toISOString(),
    postedAt: jobPostedAt(job).toISOString(),
    status: job.status,
    updatedAt: job.updatedAt.toISOString(),
  };
}
