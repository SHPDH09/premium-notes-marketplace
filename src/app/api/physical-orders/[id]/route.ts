import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalOrder } from "@/lib/physical/serializers";
import { STUDENT_CANCELLABLE } from "@/lib/physical/status-machine";
import { appendStatusHistory } from "@/lib/physical/orders";
import { removeFromPrintingQueue } from "@/lib/physical/printing-queue";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const order = await prisma.physicalOrder.findFirst({
    where: { id: params.id, userId: auth.session!.user.id },
    include: {
      items: true,
      address: true,
      history: { orderBy: { createdAt: "asc" } },
      printingJob: true,
      shipment: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({ order: serializePhysicalOrder(order) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { action?: string; reason?: string };
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const order = await prisma.physicalOrder.findFirst({
    where: { id: params.id, userId: auth.session!.user.id },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (!STUDENT_CANCELLABLE.includes(order.fulfillmentStatus)) {
    return NextResponse.json(
      {
        error:
          "Cancellation is no longer available because printing has started.",
      },
      { status: 400 }
    );
  }

  if (order.paymentStatus === "SUCCESS") {
    return NextResponse.json(
      { error: "Please contact support to cancel a paid order." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.physicalOrder.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: "CANCELLED",
        cancelReason: body.reason?.trim() || "Cancelled by student",
        paymentStatus: order.paymentStatus === "PENDING" ? "FAILED" : order.paymentStatus,
      },
    });
    await appendStatusHistory(tx, order.id, "CANCELLED", body.reason, auth.session!.user.id);
    await removeFromPrintingQueue(tx, order.id);
  });

  return NextResponse.json({ ok: true });
}
