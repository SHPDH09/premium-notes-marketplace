import { brand } from "@/config/brand";
import { jobSharePath } from "@/lib/placement/share-metadata";

export function buildJobShareUrl(jobId: string, origin?: string): string {
  const base = (origin ?? brand.website).replace(/\/$/, "");
  return `${base}${jobSharePath(jobId)}`;
}

