import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { userId: auth.session!.user.id },
  });
  if (!profile?.resumeStorageKey) {
    return NextResponse.json({ error: "No resume uploaded" }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(profile.resumeStorageKey, 600);
  if (!url) {
    return NextResponse.json({ error: "Could not prepare download" }, { status: 500 });
  }

  return NextResponse.json({
    url,
    fileName: profile.resumeFileName ?? "resume.pdf",
  });
}
