import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { generateApplicationEmail } from "@/lib/placement/ai-application-email";
import { userHasActivePlacementSubscription } from "@/lib/placement/subscription";
import { decryptSecret } from "@/lib/secret-crypto";
import { loadResumeBuffer, sendApplicationEmail } from "@/lib/placement/send-application-email";

const schema = z.object({ jobId: z.string().min(1) });

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

  if (!user || !job?.applyEmail) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!profile?.smtpEmail || !profile.smtpAppPasswordEnc) {
    return NextResponse.json(
      { error: "Set up your Gmail and app password on the dashboard first." },
      { status: 400 }
    );
  }

  let appPassword: string;
  try {
    appPassword = decryptSecret(profile.smtpAppPasswordEnc);
  } catch {
    return NextResponse.json({ error: "Could not read saved email credentials. Save them again." }, { status: 500 });
  }

  const resumeText =
    profile.resumeText?.trim() ||
    "The candidate uploaded a resume PDF on TechLaunchpad. Please review the attached resume.";

  const generated = await generateApplicationEmail({
    studentName: user.name,
    studentEmail: user.email,
    resumeText,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    header: profile.emailHeader,
    footer: profile.emailFooter,
  });

  const resumeBuffer = await loadResumeBuffer(profile.resumeStorageKey);

  try {
    await sendApplicationEmail({
      fromEmail: profile.smtpEmail,
      appPassword,
      to: job.applyEmail,
      subject: generated.subject,
      body: generated.body,
      resumeBuffer,
      resumeFileName: profile.resumeFileName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json(
      {
        error:
          "Could not send email. Check Gmail + app password (Google Account → Security → App passwords). " +
          message,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, source: generated.source });
}
