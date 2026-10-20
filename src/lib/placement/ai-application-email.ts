import { getPlacementOpenAiKey } from "@/lib/placement/openai-config";
import { openAiJsonCompletion } from "@/lib/placement/openai-chat";

type GenerateParams = {
  studentName: string;
  studentEmail: string;
  resumeText: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  header?: string | null;
  footer?: string | null;
};

function fallbackEmail(params: GenerateParams) {
  const middle = [
    `Dear Hiring Team,`,
    ``,
    `I am excited to apply for the ${params.jobTitle} role at ${params.company}. The work you are doing aligns with what I have been building in my studies and projects, and I would love to contribute.`,
    ``,
    `Please find my resume attached with details on my skills and experience. I would appreciate the chance to speak with you about how I can add value to your team.`,
    ``,
    `Thank you for your time.`,
    ``,
    `Best,`,
    params.studentName,
  ].join("\n");

  const body = [params.header?.trim(), middle, params.footer?.trim()].filter(Boolean).join("\n\n");
  const subject = `Application — ${params.jobTitle} | ${params.studentName}`;
  return { subject, body };
}

const EMAIL_SYSTEM_PROMPT = `You are an expert career coach writing job application emails for students in India (English).

Output JSON only: {"subject":"...","body":"..."}.

CRITICAL — resume reference:
- You receive resumeSummary ONLY as background to infer facts. NEVER paste, quote, or reproduce the summary in the email.
- Do NOT include section headers like "Headline:", "Skills:", "Experience:", "Education:", "Career Objective", or bullet dumps from the resume.
- Do NOT list LinkedIn URLs, full contact blocks, or long skill lists in the email — those are on the attached PDF.
- Write a fresh, original cover letter in your own words (like a thoughtful human typed it in 10 minutes).

Voice & quality:
- Natural, warm, professional, confident but humble — impressive without sounding AI-generated or stiff.
- Avoid clichés: "I am writing to express my interest", "Dear Sir/Madam", "I hope this email finds you well" (or use at most one mild greeting variant).
- Open with something specific to the company or role when possible (from job description).
- Weave in 2–3 concrete strengths that match the job — only facts supported by the resume reference.
- 180–280 words for the core letter (excluding custom header/footer).
- Plain text only. No markdown. No bullet lists (short paragraphs only).
- Subject: clear, professional, includes role + candidate name.
- Close with the candidate's name. Mention the resume attachment once, naturally.
- If customHeader/customFooter are provided, place them at the very top and very bottom of body unchanged.

Never invent employers, degrees, certifications, dates, or metrics not supported by the resume reference.`;

const EMAIL_RETRY_APPEND =
  "Your previous draft pasted resume content. Rewrite completely as an original cover letter. Zero copied lines from resumeSummary.";

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Detect if the model pasted the resume/summary into the email body. */
export function emailBodyLooksLikeResumePaste(body: string, resumeReference: string): boolean {
  const b = normalizeForCompare(body);
  if (!b) return false;

  const resumeMarkers = [
    "headline:",
    "skills:",
    "experience:",
    "education:",
    "career objective",
    "professional experience",
    "highlights from my profile",
    "overview of my profile",
  ];
  if (resumeMarkers.some((m) => b.includes(m))) return true;

  const ref = resumeReference.trim();
  if (!ref) return false;

  const refNorm = normalizeForCompare(ref);
  for (let len = 120; len >= 50; len -= 10) {
    for (let i = 0; i <= refNorm.length - len; i += 40) {
      const slice = refNorm.slice(i, i + len);
      if (slice.length >= 50 && b.includes(slice)) return true;
    }
  }

  return false;
}

async function requestAiEmail(
  params: GenerateParams,
  extraInstruction?: string
): Promise<{ subject: string; body: string } | null> {
  const userContent = JSON.stringify({
    task: "Write an original cover letter email. resumeSummary is REFERENCE ONLY — do not copy it into body.",
    extraInstruction: extraInstruction ?? "",
    candidate: {
      name: params.studentName,
      email: params.studentEmail,
      resumeSummaryForReferenceOnly: params.resumeText.slice(0, 8000),
    },
    job: {
      title: params.jobTitle,
      company: params.company,
      description: params.jobDescription.slice(0, 6000),
    },
    customHeader: params.header ?? "",
    customFooter: params.footer ?? "",
  });

  const raw = await openAiJsonCompletion(EMAIL_SYSTEM_PROMPT, userContent);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  if (!parsed.subject?.trim() || !parsed.body?.trim()) return null;

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
  };
}

export async function generateApplicationEmail(
  params: GenerateParams
): Promise<{ subject: string; body: string; source: "ai" | "template" }> {
  if (!getPlacementOpenAiKey()) {
    return { ...fallbackEmail(params), source: "template" };
  }

  try {
    let draft = await requestAiEmail(params);

    if (
      draft &&
      emailBodyLooksLikeResumePaste(draft.body, params.resumeText)
    ) {
      draft = await requestAiEmail(params, EMAIL_RETRY_APPEND);
    }

    if (
      !draft ||
      emailBodyLooksLikeResumePaste(draft.body, params.resumeText)
    ) {
      return { ...fallbackEmail(params), source: "template" };
    }

    return { ...draft, source: "ai" };
  } catch (e) {
    console.error("generateApplicationEmail error", e);
    return { ...fallbackEmail(params), source: "template" };
  }
}
