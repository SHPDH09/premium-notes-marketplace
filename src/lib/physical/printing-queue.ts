import type { Prisma, PhysicalPrintStatus } from "@prisma/client";

/** Active print job statuses shown in admin printing queue. */
export const PRINTING_QUEUE_STATUSES: PhysicalPrintStatus[] = [
  "PENDING_PRINT",
  "PRINTING",
  "PRINTED",
  "QC_PENDING",
  "QC_FAILED",
  "REPRINT_REQUIRED",
];

const notCancelledOrder = { fulfillmentStatus: { not: "CANCELLED" as const } };

export function printingQueueJobWhere(): Prisma.PrintingJobWhereInput {
  return {
    status: { in: PRINTING_QUEUE_STATUSES },
    order: notCancelledOrder,
  };
}

/** Dashboard badge: in-progress jobs only (excludes cancelled orders). */
export function printingQueueDashboardCountWhere(): Prisma.PrintingJobWhereInput {
  return {
    status: { in: ["PENDING_PRINT", "PRINTING", "QC_PENDING"] },
    order: notCancelledOrder,
  };
}

/** Remove an order from the admin print queue (drops the printing job row). */
export async function removeFromPrintingQueue(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  await tx.printingJob.deleteMany({ where: { orderId } });
}
