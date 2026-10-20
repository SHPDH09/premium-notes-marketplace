export function getPlacementOpenAiKey(): string | undefined {
  const key =
    process.env.PLACEMENT_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  return key || undefined;
}

export function getPlacementOpenAiModel(): string {
  return (
    process.env.PLACEMENT_OPENAI_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}
