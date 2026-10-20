import { getPlacementOpenAiKey, getPlacementOpenAiModel } from "@/lib/placement/openai-config";

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return typeof result.text === "string" ? result.text.trim() : "";
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  } as Parameters<typeof pdfjs.getDocument>[0]).promise;

  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    if (pageText.trim()) parts.push(pageText.trim());
  }

  return parts.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

/** Use OpenAI to read scanned/image PDFs when local parsers find no text. */
async function extractWithOpenAiPdf(buffer: Buffer, fileName: string): Promise<string> {
  const apiKey = getPlacementOpenAiKey();
  if (!apiKey) return "";

  const model = getPlacementOpenAiModel();
  const base64 = buffer.toString("base64");
  const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(0, 120) || "resume.pdf";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: safeName,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Extract ALL readable text from this resume PDF exactly as written (names, skills, jobs, dates, education). Output plain text only, no commentary.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI PDF extract failed", res.status, (await res.text()).slice(0, 400));
    return "";
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export type ExtractPdfResult = {
  text: string;
  method: "pdf-parse" | "pdfjs" | "openai" | "none";
};

/** Server-side PDF text extraction with fallbacks for Vercel/serverless. */
export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  fileName = "resume.pdf"
): Promise<ExtractPdfResult> {
  const attempts: Array<() => Promise<string>> = [
    () => extractWithPdfParse(buffer),
    () => extractWithPdfJs(buffer),
  ];

  for (const attempt of attempts) {
    try {
      const text = await attempt();
      if (text.length >= 25) {
        return { text, method: attempt === attempts[0] ? "pdf-parse" : "pdfjs" };
      }
    } catch (e) {
      console.warn("PDF extract attempt failed", e);
    }
  }

  try {
    const aiText = await extractWithOpenAiPdf(buffer, fileName);
    if (aiText.length >= 25) {
      return { text: aiText, method: "openai" };
    }
  } catch (e) {
    console.error("OpenAI PDF extract error", e);
  }

  return { text: "", method: "none" };
}
