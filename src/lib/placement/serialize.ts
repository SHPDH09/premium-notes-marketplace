import type { JobPosting, PlacementSubscriptionPlan, PlacedStudent } from "@prisma/client";
import { jobPostedAt } from "@/lib/placement/job-posted-at";
import { getPublicCoverUrl } from "@/lib/storage";
import { decimalToNumber } from "@/lib/utils";

export function serializeJobPosting(job: JobPosting) {
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
    status: job.status,
    source: job.source,
    reviewStatus: job.reviewStatus,
    adminReviewNote: job.adminReviewNote,
    submittedByUserId: job.submittedByUserId,
    viewCount: job.viewCount,
    sortOrder: job.sortOrder,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

/** Public job board — no recruiter email or WhatsApp number in API or share payloads. */
export function serializeJobPostingPublic(job: JobPosting, applyCount = 0) {
  const full = serializeJobPosting(job);
  const { applyEmail, applyPhone, ...rest } = full;
  void applyEmail;
  const postedAt = jobPostedAt(job).toISOString();
  const base = {
    ...rest,
    postedAt,
    applyCount,
    viewCount: job.viewCount,
  };
  if (job.applyType === "CALL") {
    return { ...base, applyPhone };
  }
  void applyPhone;
  return base;
}

export function serializePlacementPlan(plan: PlacementSubscriptionPlan) {
  const priceAmount = decimalToNumber(plan.priceAmount);
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceAmount,
    priceLabel: plan.priceLabel ?? (priceAmount > 0 ? `₹${priceAmount}` : "Free"),
    durationDays: plan.durationDays,
    status: plan.status,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt.toISOString(),
  };
}

export function serializePlacedStudent(row: PlacedStudent) {
  return {
    id: row.id,
    displayName: row.displayName,
    company: row.company,
    role: row.role,
    packageLabel: row.packageLabel,
    photo: getPublicCoverUrl(row.photo),
    story: row.story,
    status: row.status,
    sortOrder: row.sortOrder,
  };
}
