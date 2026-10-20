import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { isAllowedStorageKey } from "@/lib/file-limits";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const userId = auth.session!.user.id;
  const profile = await prisma.studentCareerProfile.findUnique({ where: { userId } });

  return NextResponse.json({
    profile: {
      resumeStorageKey: profile?.resumeStorageKey ?? null,
      resumeFileName: profile?.resumeFileName ?? null,
      resumeText: profile?.resumeText ?? "",
      emailHeader: profile?.emailHeader ?? "",
      emailFooter: profile?.emailFooter ?? "",
    },
  });
}

const patchSchema = z.object({
  resumeStorageKey: z.string().nullable().optional(),
  resumeFileName: z.string().nullable().optional(),
  resumeText: z.string().nullable().optional(),
  emailHeader: z.string().nullable().optional(),
  emailFooter: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.resumeStorageKey && !isAllowedStorageKey(data.resumeStorageKey, "resumes")) {
    return NextResponse.json({ error: "Invalid resume key" }, { status: 400 });
  }

  const userId = auth.session!.user.id;
  const profile = await prisma.studentCareerProfile.upsert({
    where: { userId },
    create: {
      userId,
      resumeStorageKey: data.resumeStorageKey ?? null,
      resumeFileName: data.resumeFileName ?? null,
      resumeText: data.resumeText ?? null,
      emailHeader: data.emailHeader ?? null,
      emailFooter: data.emailFooter ?? null,
    },
    update: {
      ...(data.resumeStorageKey !== undefined ? { resumeStorageKey: data.resumeStorageKey } : {}),
      ...(data.resumeFileName !== undefined ? { resumeFileName: data.resumeFileName } : {}),
      ...(data.resumeText !== undefined ? { resumeText: data.resumeText } : {}),
      ...(data.emailHeader !== undefined ? { emailHeader: data.emailHeader } : {}),
      ...(data.emailFooter !== undefined ? { emailFooter: data.emailFooter } : {}),
    },
  });

  return NextResponse.json({
    profile: {
      resumeStorageKey: profile.resumeStorageKey,
      resumeFileName: profile.resumeFileName,
      resumeText: profile.resumeText ?? "",
      emailHeader: profile.emailHeader ?? "",
      emailFooter: profile.emailFooter ?? "",
    },
  });
}
