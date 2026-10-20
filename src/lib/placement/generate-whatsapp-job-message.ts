import type { JobPosting } from "@prisma/client";
import { buildJobShareUrl } from "@/lib/placement/job-share-url";
import {
  extractBulletLines,
  extractLabeledValue,
  pickHeaderEmoji,
  splitDescriptionSections,
} from "@/lib/placement/parse-job-description";
import { getPlacementOpenAiKey } from "@/lib/placement/openai-config";
import { openAiJsonCompletion } from "@/lib/placement/openai-chat";
import {
  renderWhatsAppJobTemplate,
  type WhatsAppJobStructured,
} from "@/lib/placement/whatsapp-job-template";

function buildTagline(experience: string | undefined, location: string | undefined): string {
  const parts = [experience, location].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Open opportunity | See job overview";
}

function heuristicStructure(job: JobPosting): WhatsAppJobStructured {
  const desc = job.description.trim();
  const { responsibilities, skills } = splitDescriptionSections(desc);

  const experience =
    extractLabeledValue(desc, ["Experience", "Exp", "Years of experience"]) ??
    extractLabeledValue(desc, ["Experience required"]);
  const qualification =
    extractLabeledValue(desc, ["Qualification", "Education", "Eligibility"]);
  const workMode = extractLabeledValue(desc, ["Work mode", "Work Mode", "Mode"]);
  const joining = extractLabeledValue(desc, ["Joining", "Start date"]);
  const salary =
    extractLabeledValue(desc, ["Salary", "Expected Salary", "CTC", "Package"]);

  let resp = responsibilities;
  let skill = skills;
  if (!resp.length) {
    const bullets = extractBulletLines(desc);
    resp = bullets.slice(0, 8);
    skill = bullets.slice(8, 16);
  }

  const titleLine = `${job.title.toUpperCase()} – ${job.company.toUpperCase()}`;

  return {
    headerEmoji: pickHeaderEmoji(job.title, desc),
    titleLine,
    taglineLine: buildTagline(
      experience,
      job.location?.trim() || extractLabeledValue(desc, ["Location"])
    ),
    overview: {
      company: job.company,
      role: job.title,
      experience: experience ?? "As mentioned in job description",
      qualification: qualification ?? "As per company requirements",
      location: job.location?.trim() || extractLabeledValue(desc, ["Location"]) || "See apply link",
      workMode: workMode ?? "As per company policy",
      joining: joining ?? "As discussed during hiring",
      salary: salary ?? "As per company standards (discuss in interview)",
    },
    responsibilities: resp,
    skills: skill,
    verifyNote: `Verify the vacancy through ${job.company}'s official website or verified HR channels before sharing personal documents.`,
    shareAudienceLine: `Share this opportunity with candidates who match the ${job.title} role.`,
    channelJobsLine: `Follow our WhatsApp Channel for More Jobs:`,
  };
}

const WHATSAPP_FORMAT_SYSTEM = `You format job postings into WhatsApp channel posts. Output JSON only matching this schema:
{
  "headerEmoji": "single emoji",
  "titleLine": "ROLE IN CAPS – COMPANY IN CAPS",
  "taglineLine": "Experience summary | Location",
  "overview": {
    "experience": "string",
    "qualification": "string",
    "workMode": "string",
    "joining": "string",
    "salary": "string"
  },
  "responsibilities": ["string", ... up to 10],
  "skills": ["string", ... up to 10],
  "verifyNote": "one sentence verify disclaimer mentioning company name",
  "shareAudienceLine": "one sentence who should share this job",
  "channelJobsLine": "Follow our WhatsApp Channel for More ... Jobs:"
}
Use ONLY facts from the job posting. Do not invent recruiter emails. Company and role come from input.`;

async function aiStructure(job: JobPosting): Promise<WhatsAppJobStructured | null> {
  const userJson = JSON.stringify({
    company: job.company,
    title: job.title,
    location: job.location,
    description: job.description.slice(0, 8000),
  });

  const raw = await openAiJsonCompletion(WHATSAPP_FORMAT_SYSTEM, userJson);
  if (!raw) return null;

  try {
    const p = JSON.parse(raw) as Partial<WhatsAppJobStructured> & {
      overview?: Partial<WhatsAppJobStructured["overview"]>;
    };
    const base = heuristicStructure(job);
    return {
      headerEmoji: p.headerEmoji?.trim() || base.headerEmoji,
      titleLine: p.titleLine?.trim() || base.titleLine,
      taglineLine: p.taglineLine?.trim() || base.taglineLine,
      overview: {
        company: job.company,
        role: job.title,
        location: job.location ?? base.overview.location,
        experience: p.overview?.experience?.trim() || base.overview.experience,
        qualification: p.overview?.qualification?.trim() || base.overview.qualification,
        workMode: p.overview?.workMode?.trim() || base.overview.workMode,
        joining: p.overview?.joining?.trim() || base.overview.joining,
        salary: p.overview?.salary?.trim() || base.overview.salary,
      },
      responsibilities:
        Array.isArray(p.responsibilities) && p.responsibilities.length
          ? p.responsibilities.map(String).slice(0, 12)
          : base.responsibilities,
      skills:
        Array.isArray(p.skills) && p.skills.length
          ? p.skills.map(String).slice(0, 12)
          : base.skills,
      verifyNote: p.verifyNote?.trim() || base.verifyNote,
      shareAudienceLine: p.shareAudienceLine?.trim() || base.shareAudienceLine,
      channelJobsLine: p.channelJobsLine?.trim() || base.channelJobsLine,
    };
  } catch {
    return null;
  }
}

export async function generateWhatsAppJobMessage(
  job: JobPosting,
  origin?: string
): Promise<{ message: string; source: "ai" | "template" }> {
  const applyLink = buildJobShareUrl(job.id, origin);
  let structured: WhatsAppJobStructured;
  let source: "ai" | "template" = "template";

  if (getPlacementOpenAiKey()) {
    const ai = await aiStructure(job);
    if (ai) {
      structured = ai;
      source = "ai";
    } else {
      structured = heuristicStructure(job);
    }
  } else {
    structured = heuristicStructure(job);
  }

  return {
    message: renderWhatsAppJobTemplate(structured, applyLink),
    source,
  };
}
