import { getPlacementOpenAiKey, getPlacementOpenAiModel } from "@/lib/placement/openai-config";

export async function generateResumeSummary(rawText: string): Promise<{
  summary: string;
  source: "ai" | "extract";
}> {
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  if (cleaned.length < 30) {
    return { summary: "", source: "extract" };
  }

  const apiKey = getPlacementOpenAiKey();
  if (!apiKey) {
    return { summary: cleaned.slice(0, 4500), source: "extract" };
  }

  const model = getPlacementOpenAiModel();
  const system = `You summarize resumes for job-application AI. Output JSON only: {"summary":"..."}.
The summary must be plain text (no markdown), under 1400 characters, with these sections:
Headline: (one line role/strength)
Skills: (comma-separated)
Experience: (3-5 short bullet lines starting with "- ")
Education: (one line if present)
Use ONLY facts from the source text. Do not invent employers, degrees, or dates. If the PDF text is garbled, extract whatever is clearly readable.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({ resumeText: cleaned.slice(0, 14_000) }),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("OpenAI resume summary failed", res.status, (await res.text()).slice(0, 400));
      return { summary: cleaned.slice(0, 4500), source: "extract" };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return { summary: cleaned.slice(0, 4500), source: "extract" };

    const parsed = JSON.parse(raw) as { summary?: string };
    const summary = parsed.summary?.trim();
    if (!summary || summary.length < 20) {
      return { summary: cleaned.slice(0, 4500), source: "extract" };
    }

    return { summary: summary.slice(0, 5000), source: "ai" };
  } catch (e) {
    console.error("OpenAI resume summary error", e);
    return { summary: cleaned.slice(0, 4500), source: "extract" };
  }
}
