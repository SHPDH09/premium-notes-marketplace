import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { buildPhysicalInvoiceForUser } from "@/lib/invoice/build-physical-invoice";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const invoice = await buildPhysicalInvoiceForUser(params.id, auth.session!.user.id);
  if (!invoice) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
