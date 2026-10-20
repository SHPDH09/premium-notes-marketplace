import { getPlacementOpenAiKey } from "@/lib/placement/openai-config";
import { openAiJsonCompletion } from "@/lib/placement/openai-chat";
import { emailBodyLooksLikeResumePaste } from "@/lib/placement/ai-application-email";

type GenerateParams = {
  studentName: string;
  resumeText: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
};

function fallbackMessage(params: GenerateParams): string {
  return [
    `Hello,`,
    ``,
    `I'm ${params.studentName}. I'd like to apply for the *${params.jobTitle}* role at *${params.company}*.`,
    ``,
    `I've attached my resume for your review. My background aligns with what you're looking for, and I'd appreciate a chance to discuss how I can contribute.`,
    ``,
    `Thank you.`,
    params.studentName,
  ].join("\n");
}

const WHATSAPP_SYSTEM_PROMPT = `You write WhatsApp job application messages for students in India (English).

Output JSON only: {"message":"..."}.

CRITICAL — resume reference:
- resumeSummary is REFERENCE ONLY to infer facts. Never paste, quote, or reproduce the summary in the message.
- No "Headline:", "Skills:", bullet dumps, or long lists copied from the resume.

Style:
- WhatsApp-friendly: short paragraphs, line breaks, optional *bold* for role/company only (single asterisks).
- Warm, human, professional — not robotic or overly formal.
- 80–160 words.
- Mention the attached resume once naturally.
- 2–3 strengths matched to the job from the reference only.
- Do not invent employers, degrees, or metrics.

Never use email-style "Dear Sir/Madam" or "I hope this message finds you well".`;

const WHATSAPP_RETRY_APPEND =
  "Rewrite without copying resumeSummary. Original WhatsApp text only, with resume mentioned as attached.";

async function requestAiMessage(
  params: GenerateParams,
  extraInstruction?: string
): Promise<string | null> {
  const userContent = JSON.stringify({
    task: "Write a WhatsApp application message. resumeSummary is reference only.",
    extraInstruction: extraInstruction ?? "",
    candidate: {
      name: params.studentName,
      resumeSummaryForReferenceOnly: params.resumeText.slice(0, 8000),
    },
    job: {
      title: params.jobTitle,
      company: params.company,
      description: params.jobDescription.slice(0, 6000),
    },
  });

  const raw = await openAiJsonCompletion(WHATSAPP_SYSTEM_PROMPT, userContent);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as { message?: string };
  const message = parsed.message?.trim();
  return message || null;
}

export async function generateWhatsAppApplicationMessage(
  params: GenerateParams
): Promise<{ message: string; source: "ai" | "template" }> {
  if (!getPlacementOpenAiKey()) {
    return { message: fallbackMessage(params), source: "template" };
  }

  try {
    let draft = await requestAiMessage(params);

    if (draft && emailBodyLooksLikeResumePaste(draft, params.resumeText)) {
      draft = await requestAiMessage(params, WHATSAPP_RETRY_APPEND);
    }

    if (!draft || emailBodyLooksLikeResumePaste(draft, params.resumeText)) {
      return { message: fallbackMessage(params), source: "template" };
    }

    return { message: draft, source: "ai" };
  } catch (e) {
    console.error("generateWhatsAppApplicationMessage error", e);
    return { message: fallbackMessage(params), source: "template" };
  }
}
