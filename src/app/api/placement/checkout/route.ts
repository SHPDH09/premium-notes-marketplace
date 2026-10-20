import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { createPlacementPlanCheckout } from "@/lib/placement/create-plan-checkout";

const schema = z.object({ planId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.session!.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const result = await createPlacementPlanCheckout({
      userId: user.id,
      userEmail: user.email,
      userPhone: user.phone,
      userName: user.name,
      planId: parsed.data.planId,
      appBaseUrl: resolveAppBaseUrl(req),
    });

    if ("free" in result && result.free) {
      return NextResponse.json({ planOrderId: result.planOrderId, free: true });
    }

    return NextResponse.json({
      planOrderId: result.planOrderId,
      paymentSessionId: result.paymentSessionId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
