import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { userId: auth.session!.user.id },
  });

  return NextResponse.json({
    smtpEmail: profile?.smtpEmail ?? "",
    emailConfigured: !!(profile?.smtpEmail && profile?.smtpAppPasswordEnc),
  });
}

const patchSchema = z.object({
  smtpEmail: z.string().email(),
  appPassword: z.string().min(8).max(100),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid Gmail and app password (8–100 characters)." }, { status: 400 });
  }

  const { smtpEmail, appPassword } = parsed.data;
  const normalizedPassword = appPassword.replace(/\s/g, "");

  let encrypted: string;
  try {
    encrypted = encryptSecret(normalizedPassword);
  } catch {
    return NextResponse.json({ error: "Server cannot store email credentials (AUTH_SECRET missing)." }, { status: 500 });
  }

  const userId = auth.session!.user.id;
  await prisma.studentCareerProfile.upsert({
    where: { userId },
    create: {
      userId,
      smtpEmail: smtpEmail.trim().toLowerCase(),
      smtpAppPasswordEnc: encrypted,
    },
    update: {
      smtpEmail: smtpEmail.trim().toLowerCase(),
      smtpAppPasswordEnc: encrypted,
    },
  });

  return NextResponse.json({ ok: true, emailConfigured: true, smtpEmail: smtpEmail.trim().toLowerCase() });
}
