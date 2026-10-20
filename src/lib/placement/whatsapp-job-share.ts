import { buildJobShareUrl } from "@/lib/placement/job-share-url";

export type WhatsAppJobShareInput = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  applyType: string;
  description: string;
};

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Client fallback if API fails — minimal; prefer /api/placement/jobs/[id]/whatsapp-message */
export function buildWhatsAppJobShareMessage(job: WhatsAppJobShareInput, origin?: string): string {
  const applyLink = buildJobShareUrl(job.id, origin);
  return `💼 ${job.title.toUpperCase()} – ${job.company.toUpperCase()}\n\n👉 Apply: ${applyLink}\n\n(Full formatted message loading failed — refresh and try WhatsApp again.)`;
}
