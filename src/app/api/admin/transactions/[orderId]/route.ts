import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { refundOrder } from "@/lib/orders";
import { formatRefundAdminNote } from "@/lib/refund-reason";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { adminNote?: string };
    if (body.adminNote === undefined) {
      return NextResponse.json({ error: "adminNote is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const updated = await prisma.order.update({
      where: { id: params.orderId },
      data: { adminNote: body.adminNote.trim() || null },
    });

    return NextResponse.json({ adminNote: updated.adminNote });
  } catch (e) {
    console.error("admin transaction note PATCH", e);
    const message = e instanceof Error ? e.message : "Failed to save note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason?.trim();
    if (!reason) {
      return NextResponse.json({ error: "Refund reason is required" }, { status: 400 });
    }

    const result = await refundOrder(params.orderId);

    const existing = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { adminNote: true },
    });

    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        refundReason: reason,
        adminNote: formatRefundAdminNote(reason, existing?.adminNote),
      },
    });

    return NextResponse.json({
      ok: true,
      warning: result.gatewayWarning,
    });
  } catch (e) {
    console.error("admin transaction refund POST", e);
    const message = e instanceof Error ? e.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
