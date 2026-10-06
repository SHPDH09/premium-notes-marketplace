import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { createCheckoutOrder } from "@/lib/checkout-server";
import { prisma } from "@/lib/db";
import { resolveAppBaseUrl } from "@/lib/app-url";

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.session!.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const baseUrl = resolveAppBaseUrl(req);
    const result = await createCheckoutOrder(
      user.id,
      user.email,
      user.phone ?? undefined,
      baseUrl,
      user.name
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
