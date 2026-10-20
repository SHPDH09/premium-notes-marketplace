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
    `I am writing to express my interest in the ${params.jobTitle} role at ${params.company}.`,
    ``,
    `Please find my resume attached for your review. I believe my background aligns well with the requirements outlined in your job posting.`,
    ``,
    params.resumeText.trim()
      ? `Highlights from my profile:\n${params.resumeText.trim().slice(0, 1200)}`
      : `I have uploaded my resume on my TechLaunchpad placement profile.`,
    ``,
    `Thank you for your time and consideration.`,
    ``,
    `Best regards,`,
    params.studentName,
    params.studentEmail,
  ].join("\n");

  const body = [params.header?.trim(), middle, params.footer?.trim()].filter(Boolean).join("\n\n");
  const subject = `Application for ${params.jobTitle} — ${params.studentName}`;
  return { subject, body };
}

export async function generateApplicationEmail(
  params: GenerateParams
): Promise<{ subject: string; body: string; source: "ai" | "template" }> {
  const apiKey = process.env.PLACEMENT_OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ...fallbackEmail(params), source: "template" };
  }

  const model = process.env.PLACEMENT_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const system = `You write professional job application emails for students in India. Output JSON only: {"subject":"...","body":"..."}. The body must be plain text (no markdown). Tailor the email to the job description and the candidate resume. Keep it concise (180-260 words in the main letter). Do not invent employers or degrees not supported by the resume text.`;

  const userContent = JSON.stringify({
    candidate: {
      name: params.studentName,
      email: params.studentEmail,
      resume: params.resumeText.slice(0, 8000),
    },
    job: {
      title: params.jobTitle,
      company: params.company,
      description: params.jobDescription.slice(0, 6000),
    },
    customHeader: params.header ?? "",
    customFooter: params.footer ?? "",
    instructions:
      "Include custom header at the top and custom footer at the bottom when provided. Mention that the resume is attached.",
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      return { ...fallbackEmail(params), source: "template" };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
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
  } catch {
    return { ...fallbackEmail(params), source: "template" };
  }
}
