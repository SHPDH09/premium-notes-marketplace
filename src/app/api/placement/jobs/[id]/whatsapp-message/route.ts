import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWhatsAppJobMessage } from "@/lib/placement/generate-whatsapp-job-message";
import { brand } from "@/config/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.jobPosting.findFirst({
    where: { id: params.id, status: "ACTIVE" },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const forwarded = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwarded
    ? `${proto}://${forwarded.split(",")[0]?.trim()}`
    : brand.website;

  const { message, source } = await generateWhatsAppJobMessage(job, origin);

  return NextResponse.json({ message, source });
}
