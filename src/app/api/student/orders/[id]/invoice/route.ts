import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { buildDigitalInvoiceForUser } from "@/lib/invoice/build-digital-invoice";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const invoice = await buildDigitalInvoiceForUser(params.id, auth.session!.user.id);
  if (!invoice) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
