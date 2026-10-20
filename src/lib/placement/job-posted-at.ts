import type { JobPosting } from "@prisma/client";

/** When the job appears as "posted" on the public board (live date for verified student jobs). */
export function jobPostedAt(job: Pick<JobPosting, "source" | "reviewStatus" | "createdAt" | "updatedAt">): Date {
  if (job.source === "STUDENT" && job.reviewStatus === "VERIFIED") {
    return job.updatedAt;
  }
  return job.createdAt;
}

export function daysSincePosted(postedAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - postedAt.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatJobPostedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDaysSincePosted(days: number): string {
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}
