import { brand } from "@/config/brand";

export function buildJobShareUrl(jobId: string, origin?: string): string {
  const base = (origin ?? brand.website).replace(/\/$/, "");
  return `${base}/placement?job=${encodeURIComponent(jobId)}`;
}

