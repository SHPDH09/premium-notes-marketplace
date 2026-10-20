const SEP = "━━━━━━━━━━━━━━━━━━━━";

export { SEP as WHATSAPP_JOB_SEPARATOR };

export function extractBulletLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    if (/^[-*•–—]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*•–—]\s+/, "").trim());
      continue;
    }
    if (/^✅\s*/.test(line)) {
      bullets.push(line.replace(/^✅\s*/, "").trim());
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      bullets.push(line.replace(/^\d+[.)]\s+/, "").trim());
    }
  }

  return bullets;
}

export function extractLabeledValue(description: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-–—]?\\s*(.+?)(?=\\n|$)`, "i");
    const m = description.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

export function splitDescriptionSections(description: string): {
  responsibilities: string[];
  skills: string[];
  otherBullets: string[];
} {
  const lower = description.toLowerCase();
  const respIdx = findSectionIndex(lower, [
    "key responsibilities",
    "responsibilities",
    "roles and responsibilities",
    "what you will do",
  ]);
  const skillIdx = findSectionIndex(lower, [
    "required skills",
    "skills required",
    "key skills",
    "requirements",
    "qualifications",
  ]);

  const respEnd = skillIdx > respIdx && respIdx >= 0 ? skillIdx : description.length;
  const respBlock = respIdx >= 0 ? description.slice(respIdx, respEnd) : "";
  const skillBlock = skillIdx >= 0 ? description.slice(skillIdx) : "";

  let responsibilities = extractBulletLines(respBlock);
  let skills = extractBulletLines(skillBlock);

  const allBullets = extractBulletLines(description);
  if (!responsibilities.length && !skills.length && allBullets.length) {
    const mid = Math.ceil(allBullets.length / 2);
    responsibilities = allBullets.slice(0, mid);
    skills = allBullets.slice(mid);
  } else if (!responsibilities.length && allBullets.length) {
    responsibilities = allBullets;
  }

  return { responsibilities, skills, otherBullets: [] };
}

function findSectionIndex(lowerDesc: string, headings: string[]): number {
  let best = -1;
  for (const h of headings) {
    const i = lowerDesc.indexOf(h);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  return best;
}

export function pickHeaderEmoji(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/hospital|medical|nurse|health|medcity|clinic/.test(t)) return "🏥";
  if (/data analyst|mis|analytics|excel|sql/.test(t)) return "📊";
  if (/software|developer|engineer|it |tech/.test(t)) return "💻";
  if (/marketing|sales|business/.test(t)) return "📈";
  return "💼";
}
