import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { getActiveJobPosting } from "@/lib/placement/get-public-job";

/** Static PNG used in link previews (WhatsApp, Chrome share, etc.). */
export const BRAND_SHARE_IMAGE_PATH = "/brand/techlaunchpad-og.png";

export function brandShareImage() {
  return {
    url: BRAND_SHARE_IMAGE_PATH,
    width: 1774,
    height: 887,
    alt: `${brand.name} logo`,
  } as const;
}

export function jobSharePath(jobId: string) {
  return `/placement/jobs/${jobId}`;
}

export function jobShareDescription(title: string, company: string, location?: string | null) {
  const place = location ? ` (${location})` : "";
  return `Job opening: ${title} at ${company}${place}. Apply on ${brand.name} Placement.`;
}

export async function buildJobShareMetadata(jobId: string): Promise<Metadata | null> {
  const job = await getActiveJobPosting(jobId);
  if (!job) return null;

  const title = `${job.title} — ${job.company}`;
  const description = jobShareDescription(job.title, job.company, job.location);
  const url = `${brand.website}${jobSharePath(job.id)}`;
  const image = brandShareImage();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export async function buildPlacementPageMetadata(jobId?: string | null): Promise<Metadata> {
  if (jobId) {
    const jobMeta = await buildJobShareMetadata(jobId);
    if (jobMeta) return jobMeta;
  }

  const title = "Placement Jobs";
  const description = "Browse placement job openings and apply on TechLaunchpad.";
  const image = brandShareImage();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: `${title} | ${brand.name}`,
      description,
      url: `${brand.website}/placement`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${brand.name}`,
      description,
      images: [image.url],
    },
  };
}
