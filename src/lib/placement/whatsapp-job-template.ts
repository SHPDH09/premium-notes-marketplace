import { brand } from "@/config/brand";
import { WHATSAPP_JOB_SEPARATOR } from "@/lib/placement/parse-job-description";

export type WhatsAppJobStructured = {
  headerEmoji: string;
  titleLine: string;
  taglineLine: string;
  overview: {
    company: string;
    role: string;
    experience?: string;
    qualification?: string;
    location?: string;
    workMode?: string;
    joining?: string;
    salary?: string;
  };
  responsibilities: string[];
  skills: string[];
  verifyNote: string;
  shareAudienceLine: string;
  channelJobsLine: string;
};

export function renderWhatsAppJobTemplate(
  structured: WhatsAppJobStructured,
  applyLink: string
): string {
  const o = structured.overview;
  const channelUrl = brand.whatsappChannelUrl;

  const lines: string[] = [
    `${structured.headerEmoji} ${structured.titleLine}`,
    ``,
    structured.taglineLine,
    ``,
    WHATSAPP_JOB_SEPARATOR,
    ``,
    `📌 JOB OVERVIEW`,
    ``,
    `🏢 Company: ${o.company}`,
    `💼 Role: ${o.role}`,
  ];

  if (o.experience) lines.push(`🎓 Experience: ${o.experience}`);
  if (o.qualification) lines.push(`📚 Qualification: ${o.qualification}`);
  if (o.location) lines.push(`📍 Location: ${o.location}`);
  if (o.workMode) lines.push(`🏢 Work Mode: ${o.workMode}`);
  if (o.joining) lines.push(`📅 Joining: ${o.joining}`);
  if (o.salary) lines.push(`💰 Expected Salary: ${o.salary}`);

  lines.push(``, `🔹 KEY RESPONSIBILITIES`, ``);
  if (structured.responsibilities.length) {
    for (const r of structured.responsibilities.slice(0, 12)) {
      lines.push(`✅ ${r}`);
    }
  } else {
    lines.push(`✅ Refer to the job description on the apply link.`);
  }

  lines.push(``, `🔹 REQUIRED SKILLS`, ``);
  if (structured.skills.length) {
    for (const s of structured.skills.slice(0, 12)) {
      lines.push(`✅ ${s}`);
    }
  } else {
    lines.push(`✅ Refer to the job description on the apply link.`);
  }

  lines.push(
    ``,
    `🔹 HOW TO APPLY`,
    ``,
    `👉 Apply on ${brand.name}:`,
    applyLink,
    ``,
    `Suggested steps:`,
    `1️⃣ Open the link above and sign in (or register).`,
    `2️⃣ Subscribe to placement if prompted.`,
    `3️⃣ Upload your resume on your placement profile.`,
    `4️⃣ Tap Apply on this job and send via Gmail (resume attached) or follow walk-in/link instructions.`,
    `5️⃣ Mention your degree, experience, and availability in your application.`,
    ``,
    `⚠️ ${structured.verifyNote}`,
    ``,
    `💰 PAYMENT DISCLAIMER`,
    ``,
    `Never pay an individual for a job offer or interview opportunity.`,
    ``,
    `📢 ${structured.shareAudienceLine}`,
    ``,
    `📲 ${structured.channelJobsLine}`,
    channelUrl,
    ``,
    WHATSAPP_JOB_SEPARATOR
  );

  return lines.join("\n");
}
