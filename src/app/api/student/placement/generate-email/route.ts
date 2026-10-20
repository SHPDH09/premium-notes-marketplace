import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { generateApplicationEmail } from "@/lib/placement/ai-application-email";
import { resumeTextForEmailGeneration } from "@/lib/placement/resume-text-for-email";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";

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
      where: { id: parsed.data.jobId, status: "ACTIVE", applyType: "EMAIL" },
    }),
    prisma.studentCareerProfile.findUnique({ where: { userId } }),
  ]);

  if (!user || !job || !job.applyEmail) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const resumeRaw =
    profile?.resumeText?.trim() ||
    "The candidate uploaded a resume PDF on TechLaunchpad. Use a professional tone and ask the recruiter to review the attached resume.";
  const resumeText = resumeTextForEmailGeneration(resumeRaw) || resumeRaw;

  const generated = await generateApplicationEmail({
    studentName: user.name,
    studentEmail: user.email,
    resumeText,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    header: profile?.emailHeader,
    footer: profile?.emailFooter,
  });

  return NextResponse.json({
    to: job.applyEmail,
    subject: generated.subject,
    body: generated.body,
    source: generated.source,
    hasResumeFile: !!profile?.resumeStorageKey,
    hasResumeSummary: !!(profile?.resumeText && profile.resumeText.trim().length > 20),
    emailConfigured: !!(profile?.smtpEmail && profile?.smtpAppPasswordEnc),
  });
}
