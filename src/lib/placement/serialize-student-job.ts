import type { JobPosting } from "@prisma/client";

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
    adminReviewNote: job.adminReviewNote,
    viewCount: job.viewCount,
    applyCount: job._count?.applications ?? 0,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
