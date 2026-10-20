import { NextResponse } from "next/server";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { serializeJobPosting } from "@/lib/placement/serialize";

export async function GET() {
  return withAdminJson(async () => {
    const jobs = await prisma.jobPosting.findMany({
      where: { source: "STUDENT" },
      orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { applications: true } },
      },
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...serializeJobPosting(j),
        applyCount: j._count.applications,
        submittedBy: j.submittedBy,
      })),
    });
  });
}
