import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const jobs = await prisma.printingJob.findMany({
    where: {
      status: {
        in: ["PENDING_PRINT", "PRINTING", "PRINTED", "QC_PENDING", "QC_FAILED", "REPRINT_REQUIRED"],
      },
    },
    include: {
      order: {
        include: { items: true, printingJob: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
  });

  return NextResponse.json({
    queue: jobs.map((j) => ({
      id: j.id,
      orderId: j.orderId,
      orderNumber: j.order.orderNumber,
      student: j.order.studentNameSnap,
      status: j.status,
      priority: j.priority,
      items: j.order.items.map((i) => ({
        documentName: i.documentNameSnap,
        quantity: i.quantity,
        pageCount: i.pageCountSnap,
        printType: i.printType,
        paperType: i.paperType,
        bindingType: i.bindingType,
      })),
    })),
  });
}
