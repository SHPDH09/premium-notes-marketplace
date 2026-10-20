import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { generateWhatsAppApplicationMessage } from "@/lib/placement/ai-whatsapp-application-message";
import { resumeTextForEmailGeneration } from "@/lib/placement/resume-text-for-email";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";
import { buildWhatsAppApplyUrl } from "@/lib/placement/whatsapp-apply-url";

const schema = z.object({
  jobId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  if (!(await userHasActivePlacementSubscription(userId))) {
    return NextResponse.json({ error: "Placement subscription required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [user, job, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.jobPosting.findFirst({
      where: { id: parsed.data.jobId, status: "ACTIVE", applyType: "WHATSAPP" },
    }),
    prisma.studentCareerProfile.findUnique({ where: { userId } }),
  ]);

  if (!user || !job?.applyPhone?.trim()) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const resumeRaw =
    profile?.resumeText?.trim() ||
    "The candidate uploaded a resume PDF on TechLaunchpad. Mention the attached resume professionally.";
  const resumeText = resumeTextForEmailGeneration(resumeRaw) || resumeRaw;

  const generated = await generateWhatsAppApplicationMessage({
    studentName: user.name,
    resumeText,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
  });

  const waUrl = buildWhatsAppApplyUrl(job.applyPhone, generated.message);
  if (!waUrl) {
    return NextResponse.json({ error: "Invalid WhatsApp number on this job" }, { status: 400 });
  }

  return NextResponse.json({
    message: generated.message,
    waUrl,
    source: generated.source,
    hasResumeFile: !!profile?.resumeStorageKey,
    hasResumeSummary: !!(profile?.resumeText && profile.resumeText.trim().length > 20),
    resumeFileName: profile?.resumeFileName ?? "resume.pdf",
  });
}
