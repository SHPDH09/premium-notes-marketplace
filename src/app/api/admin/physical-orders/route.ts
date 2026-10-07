import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePhysicalOrder } from "@/lib/physical/serializers";
import { PaymentStatus, PhysicalFulfillmentStatus, PhysicalPrintStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const paymentStatus = sp.get("paymentStatus");
  const fulfillmentStatus = sp.get("fulfillmentStatus");
  const printStatus = sp.get("printStatus");
  const sort = sp.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(20, parseInt(sp.get("pageSize") ?? "20", 10)));

  const where = {
    ...(paymentStatus && paymentStatus !== "all"
      ? { paymentStatus: paymentStatus as PaymentStatus }
      : {}),
    ...(fulfillmentStatus && fulfillmentStatus !== "all"
      ? { fulfillmentStatus: fulfillmentStatus as PhysicalFulfillmentStatus }
      : {}),
    ...(printStatus && printStatus !== "all"
      ? { printStatus: printStatus as PhysicalPrintStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { studentNameSnap: { contains: q, mode: "insensitive" as const } },
            { studentEmailSnap: { contains: q, mode: "insensitive" as const } },
            { studentPhoneSnap: { contains: q, mode: "insensitive" as const } },
            { trackingNumber: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "amount_high"
        ? { totalAmount: "desc" as const }
        : sort === "amount_low"
          ? { totalAmount: "asc" as const }
          : { createdAt: "desc" as const };

  const [total, orders] = await Promise.all([
    prisma.physicalOrder.count({ where }),
    prisma.physicalOrder.findMany({
      where,
      include: { items: true, address: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    orders: orders.map(serializePhysicalOrder),
  });
}
