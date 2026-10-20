import { brand } from "@/config/brand";

export function buildJobShareUrl(jobId: string, origin?: string): string {
  const base = (origin ?? brand.website).replace(/\/$/, "");
  return `${base}/placement?job=${encodeURIComponent(jobId)}`;
}

export function buildJobSharePayload(job: {
  id: string;
  title: string;
  company: string;
  location?: string | null;
}) {
  const url = typeof window !== "undefined" ? buildJobShareUrl(job.id, window.location.origin) : buildJobShareUrl(job.id);
  const title = `${job.title} — ${job.company}`;
  const text = job.location
    ? `Job opening: ${job.title} at ${job.company} (${job.location}). Apply on TechLaunchpad Placement.`
    : `Job opening: ${job.title} at ${job.company}. Apply on TechLaunchpad Placement.`;
  return { url, title, text };
}
