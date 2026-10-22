import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { prisma } from "@/lib/db";

export async function GET() {
  return withCrmJson(async () => {
    await requireSuperAdmin();
    const plans = await prisma.crmSubscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ plans });
  });
}
