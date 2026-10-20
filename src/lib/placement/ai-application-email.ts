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
    `I hope this message finds you well. I would like to apply for the ${params.jobTitle} position at ${params.company}.`,
    ``,
    `From my background, I believe I can contribute meaningfully to your team. Please find my resume attached for your review.`,
    ``,
    `I have attached my resume, which includes my experience, skills, and projects relevant to this role.`,
    ``,
    `Thank you for considering my application. I would welcome the opportunity to discuss how I can support ${params.company}.`,
    ``,
    `Warm regards,`,
    params.studentName,
    params.studentEmail,
  ].join("\n");

  const body = [params.header?.trim(), middle, params.footer?.trim()].filter(Boolean).join("\n\n");
  const subject = `Application for ${params.jobTitle} — ${params.studentName}`;
  return { subject, body };
}

const EMAIL_SYSTEM_PROMPT = `You write job application emails for students in India applying in English.

Output JSON only: {"subject":"...","body":"..."}.

Style:
- Sound like a real person wrote it: natural, warm, professional, confident but humble.
- Avoid robotic openings ("I am writing to express my interest", "Dear Sir/Madam" unless no name).
- Prefer "Dear Hiring Team" or "Hello [Company] Team" when no recruiter name.
- Connect 2-3 specific strengths from the resume summary to this job description (do not invent facts).
- 200–320 words for the main letter body (excluding header/footer).
- Plain text only — no markdown, no bullet lists unless very short (max 3 lines).
- Clear subject line: specific role + candidate name, professional tone.
- End with a polite close and the candidate's name.
- If customHeader/customFooter are non-empty in the input, place them at the very top and very bottom of body.
- Mention that the resume is attached (once, naturally).
- Do NOT paste or duplicate the full resume, contact block, or long bullet lists in the email body — write a short cover letter only.

Never fabricate employers, degrees, certifications, or years of experience not supported by the resume text.`;

export async function generateApplicationEmail(
  params: GenerateParams
): Promise<{ subject: string; body: string; source: "ai" | "template" }> {
  if (!getPlacementOpenAiKey()) {
    return { ...fallbackEmail(params), source: "template" };
  }

  const userContent = JSON.stringify({
    candidate: {
      name: params.studentName,
      email: params.studentEmail,
      resumeSummary: params.resumeText.slice(0, 8000),
    },
    job: {
      title: params.jobTitle,
      company: params.company,
      description: params.jobDescription.slice(0, 6000),
    },
    customHeader: params.header ?? "",
    customFooter: params.footer ?? "",
  });

  try {
    const raw = await openAiJsonCompletion(EMAIL_SYSTEM_PROMPT, userContent);
    if (!raw) return { ...fallbackEmail(params), source: "template" };

    const parsed = JSON.parse(raw) as { subject?: string; body?: string };
    if (!parsed.subject?.trim() || !parsed.body?.trim()) {
      return { ...fallbackEmail(params), source: "template" };
    }

    return {
      subject: parsed.subject.trim(),
      body: parsed.body.trim(),
      source: "ai",
    };
  } catch (e) {
    console.error("generateApplicationEmail parse error", e);
    return { ...fallbackEmail(params), source: "template" };
  }
}
