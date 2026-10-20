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

  const { text: extracted, method } = await extractTextFromPdfBuffer(
    pdf,
    profile.resumeFileName ?? "resume.pdf"
  );

  if (extracted.trim().length < 25) {
    const hint = getPlacementOpenAiKey()
      ? "Paste a short summary below, or try Regenerate again."
      : "Add PLACEMENT_OPENAI_API_KEY on Vercel for scanned PDFs, or paste a summary below.";
    return NextResponse.json(
      {
        error: `Could not read enough text from this PDF. ${hint}`,
        extractMethod: method,
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
    extractMethod: method,
    openAiConfigured: !!getPlacementOpenAiKey(),
  });
}
