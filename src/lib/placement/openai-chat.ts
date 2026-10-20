import { getPlacementOpenAiKey, getPlacementOpenAiModel } from "@/lib/placement/openai-config";

export async function openAiJsonCompletion(system: string, userJson: string): Promise<string | null> {
  const apiKey = getPlacementOpenAiKey();
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getPlacementOpenAiModel(),
      temperature: 0.68,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userJson },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI request failed", res.status, (await res.text()).slice(0, 500));
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? null;
}
