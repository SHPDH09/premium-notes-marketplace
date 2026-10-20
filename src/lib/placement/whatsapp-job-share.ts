import { brand } from "@/config/brand";
import { buildJobShareUrl } from "@/lib/placement/job-share-url";

export type WhatsAppJobShareInput = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  applyType: string;
  description: string;
};

function applyTypeLabel(applyType: string): string {
  switch (applyType) {
    case "EMAIL":
      return "Apply via TechLaunchpad";
    case "LINK":
      return "External link (apply on portal)";
    case "WALK_IN":
      return "Walk-in";
    default:
      return applyType.replace(/_/g, " ");
  }
}

/** Pre-formatted WhatsApp message ( *bold* syntax ) — no recruiter email. */
export function buildWhatsAppJobShareMessage(job: WhatsAppJobShareInput, origin?: string): string {
  const applyLink = buildJobShareUrl(job.id, origin);
  const channelUrl = brand.whatsappChannelUrl;
  const desc = job.description.trim();
  const descShort = desc.length > 480 ? `${desc.slice(0, 480).trim()}…` : desc;

  const lines: string[] = [
    `*${brand.name} — Job Opening* 🎯`,
    ``,
    `*${job.title}*`,
    `🏢 *Company:* ${job.company}`,
  ];

  if (job.location?.trim()) {
    lines.push(`📍 *Location:* ${job.location.trim()}`);
  }

  lines.push(`📋 *Apply type:* ${applyTypeLabel(job.applyType)}`);

  if (descShort) {
    lines.push(``, `*About the role:*`, descShort);
  }

  lines.push(``, `👉 *Apply here:*`, applyLink);

  if (channelUrl) {
    lines.push(``, `📢 *WhatsApp Channel (more jobs):*`, channelUrl);
  }

  return lines.join("\n");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
