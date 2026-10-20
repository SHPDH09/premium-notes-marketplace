import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicJobBoardWhere } from "@/lib/placement/job-board-visible";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.jobPosting.findFirst({
    where: { id: params.id, ...publicJobBoardWhere },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const updated = await prisma.jobPosting.update({
    where: { id: job.id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return NextResponse.json({ viewCount: updated.viewCount });
}
