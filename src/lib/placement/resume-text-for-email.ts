/** Keep AI/template input concise — not the full PDF dump in the email body. */
export function resumeTextForEmailGeneration(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  if (text.length <= 900) return text;

  const sections: string[] = [];
  for (const label of ["Headline:", "Skills:", "Experience:", "Education:"]) {
    const idx = text.indexOf(label);
    if (idx >= 0) {
      const next = ["Headline:", "Skills:", "Experience:", "Education:"]
        .map((l) => text.indexOf(l, idx + label.length))
        .filter((i) => i > idx)
        .sort((a, b) => a - b)[0];
      sections.push(text.slice(idx, next > idx ? next : idx + 420).trim());
    }
  }

  if (sections.length) {
    return sections.join("\n\n").slice(0, 1600);
  }

  return `${text.slice(0, 750).trim()}\n\n(Full resume is attached as PDF — do not repeat all details in the email.)`;
}
