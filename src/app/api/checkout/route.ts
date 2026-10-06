import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { createCheckoutOrder } from "@/lib/checkout-server";
import { prisma } from "@/lib/db";

export async function POST() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.session!.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const result = await createCheckoutOrder(user.id, user.email, user.phone ?? undefined);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
