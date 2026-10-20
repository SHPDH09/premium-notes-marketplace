import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { downloadStoredFile } from "@/lib/storage";
import { extractTextFromPdfBuffer } from "@/lib/placement/extract-pdf-text";
import { generateResumeSummary } from "@/lib/placement/generate-resume-summary";
import { getPlacementOpenAiKey } from "@/lib/placement/openai-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  const profile = await prisma.studentCareerProfile.findUnique({ where: { userId } });

  if (!profile?.resumeStorageKey) {
    return NextResponse.json({ error: "Upload a resume PDF first." }, { status: 400 });
  }

  const pdf = await downloadStoredFile(profile.resumeStorageKey);
  if (!pdf?.length) {
    return NextResponse.json(
      { error: "Could not read resume file from storage. Try uploading again." },
      { status: 502 }
    );
  }

  let extracted = "";
  try {
    extracted = await extractTextFromPdfBuffer(pdf);
  } catch (e) {
    console.error("PDF extract failed", e);
    return NextResponse.json(
      {
        error:
          "Could not read text from this PDF (it may be scanned/image-only). Paste a short summary in the box below.",
      },
      { status: 422 }
    );
  }

  if (extracted.trim().length < 25) {
    return NextResponse.json(
      {
        error:
          "Very little text found in the PDF. Use a text-based PDF or paste your summary manually.",
        extractedLength: extracted.length,
      },
      { status: 422 }
    );
  }

  const { summary, source } = await generateResumeSummary(extracted);

  if (!summary.trim()) {
    return NextResponse.json({ error: "Could not build a resume summary." }, { status: 500 });
  }

  await prisma.studentCareerProfile.update({
    where: { userId },
    data: { resumeText: summary },
  });

  return NextResponse.json({
    ok: true,
    resumeText: summary,
    summarySource: source,
    openAiConfigured: !!getPlacementOpenAiKey(),
  });
}
