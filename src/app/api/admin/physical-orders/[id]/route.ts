import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalOrder } from "@/lib/physical/serializers";
import {
  updatePhysicalFulfillmentStatus,
  refundPhysicalOrder,
  appendStatusHistory,
} from "@/lib/physical/orders";
import { logAdminAudit } from "@/lib/physical/audit";
import { PhysicalFulfillmentStatus, PhysicalPrintStatus, PhysicalShippingStatus } from "@prisma/client";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const order = await prisma.physicalOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      address: true,
      history: { orderBy: { createdAt: "asc" } },
      printingJob: true,
      shipment: true,
      refunds: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order: serializePhysicalOrder(order) });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("fulfillment"),
    status: z.nativeEnum(PhysicalFulfillmentStatus),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("print"),
    status: z.nativeEnum(PhysicalPrintStatus),
    qcReason: z.string().optional(),
  }),
  z.object({
    action: z.literal("pack"),
    packageWeight: z.string().optional(),
    packageDimensions: z.string().optional(),
    packageCount: z.number().int().positive().optional(),
    packagingNotes: z.string().optional(),
  }),
  z.object({
    action: z.literal("shipment"),
    courierName: z.string().min(1),
    trackingNumber: z.string().min(1),
    trackingUrl: z.union([z.string().url(), z.literal("")]).optional(),
    expectedDeliveryDate: z.string().optional(),
  }),
  z.object({
    action: z.literal("refund"),
    amount: z.number().positive(),
    reason: z.string().min(3),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().min(3),
  }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminId = auth.session!.user.id;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid action";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const order = await prisma.physicalOrder.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = parsed.data;

  try {
    if (body.action === "fulfillment") {
      await updatePhysicalFulfillmentStatus(params.id, body.status, adminId, body.note);
    } else if (body.action === "print") {
      const fulfillmentForPrint =
        body.status === "PRINTING" || body.status === "PRINTED"
          ? body.status === "PRINTING"
            ? "PRINTING"
            : "QUALITY_CHECK"
          : body.status === "QC_PENDING" ||
              body.status === "QC_PASSED" ||
              body.status === "QC_FAILED" ||
              body.status === "REPRINT_REQUIRED"
            ? "QUALITY_CHECK"
            : order.fulfillmentStatus;

      if (fulfillmentForPrint !== order.fulfillmentStatus) {
        await updatePhysicalFulfillmentStatus(
          params.id,
          fulfillmentForPrint,
          adminId,
          `Print workflow: ${body.status}`
        );
      }

      await prisma.$transaction(async (tx) => {
        const fresh = await tx.physicalOrder.findUnique({ where: { id: params.id } });
        await tx.physicalOrder.update({
          where: { id: params.id },
          data: {
            printStatus: body.status,
            qcFailureReason: body.qcReason ?? null,
            fulfillmentStatus: fresh?.fulfillmentStatus ?? fulfillmentForPrint,
          },
        });
        await tx.printingJob.upsert({
          where: { orderId: params.id },
          create: {
            orderId: params.id,
            status: body.status,
            qcReason: body.qcReason,
          },
          update: {
            status: body.status,
            qcReason: body.qcReason,
            printStartedAt: body.status === "PRINTING" ? new Date() : undefined,
            printCompletedAt: body.status === "PRINTED" ? new Date() : undefined,
          },
        });
        await appendStatusHistory(tx, params.id, `PRINT:${body.status}`, body.qcReason, adminId);
      });
    } else if (body.action === "pack") {
      await updatePhysicalFulfillmentStatus(params.id, "PACKED", adminId, body.packagingNotes);
      await prisma.$transaction(async (tx) => {
        await tx.physicalOrder.update({
          where: { id: params.id },
          data: {
            shippingStatus: "PACKED",
            packageWeight: body.packageWeight,
            packageDimensions: body.packageDimensions,
            packageCount: body.packageCount,
            packagingNotes: body.packagingNotes,
          },
        });
      });
    } else if (body.action === "shipment") {
      const expected = body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null;
      const trackingUrl =
        body.trackingUrl && body.trackingUrl.length > 0 ? body.trackingUrl : undefined;

      await updatePhysicalFulfillmentStatus(
        params.id,
        "SHIPPED",
        adminId,
        body.trackingNumber
      );

      await prisma.$transaction(async (tx) => {
        await tx.physicalOrder.update({
          where: { id: params.id },
          data: {
            shippingStatus: "SHIPPED",
            courierName: body.courierName,
            trackingNumber: body.trackingNumber,
            trackingUrl: trackingUrl ?? null,
            shippingDate: new Date(),
            expectedDelivery: expected,
          },
        });
        await tx.shipment.upsert({
          where: { orderId: params.id },
          create: {
            orderId: params.id,
            courierName: body.courierName,
            trackingNumber: body.trackingNumber,
            trackingUrl,
            shippingDate: new Date(),
            expectedDeliveryDate: expected,
            shippingStatus: "SHIPPED",
          },
          update: {
            courierName: body.courierName,
            trackingNumber: body.trackingNumber,
            trackingUrl,
            shippingDate: new Date(),
            expectedDeliveryDate: expected,
            shippingStatus: "SHIPPED" as PhysicalShippingStatus,
          },
        });
      });
    } else if (body.action === "refund") {
      await refundPhysicalOrder(params.id, body.amount, body.reason, adminId);
    } else if (body.action === "cancel") {
      await prisma.$transaction(async (tx) => {
        await tx.physicalOrder.update({
          where: { id: params.id },
          data: {
            fulfillmentStatus: "CANCELLED",
            cancelReason: body.reason,
          },
        });
        await appendStatusHistory(tx, params.id, "CANCELLED", body.reason, adminId);
      });
    }

    await logAdminAudit({
      adminId,
      action: body.action,
      entity: "physical_order",
      entityId: params.id,
      newValue: JSON.stringify(body),
    });

    const updated = await prisma.physicalOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        address: true,
        history: { orderBy: { createdAt: "asc" } },
        printingJob: true,
        shipment: true,
        refunds: true,
      },
    });

    return NextResponse.json({ order: updated ? serializePhysicalOrder(updated) : null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
