import type { JobPosting, PlacementSubscriptionPlan, PlacedStudent } from "@prisma/client";
import { getPublicCoverUrl } from "@/lib/storage";

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
    walkInDetails: job.walkInDetails,
    requiresSubscription: job.requiresSubscription,
    status: job.status,
    sortOrder: job.sortOrder,
    createdAt: job.createdAt.toISOString(),
  };
}

export function serializePlacementPlan(plan: PlacementSubscriptionPlan) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceLabel: plan.priceLabel,
    durationDays: plan.durationDays,
    status: plan.status,
    sortOrder: plan.sortOrder,
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
