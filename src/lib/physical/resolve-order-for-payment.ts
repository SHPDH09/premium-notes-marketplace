import { prisma } from "@/lib/db";
import type { PhysicalOrder } from "@prisma/client";

const CASHFREE_ORDER_PREFIX = "ord_";

export function looksLikeCashfreeOrderId(value: string): boolean {
  return value.startsWith(CASHFREE_ORDER_PREFIX);
}

/** Resolve physical order after Cashfree redirect (order_id may be gateway id, not Prisma uuid). */
export async function findPhysicalOrderForStudentPayment(params: {
  userId: string;
  orderId?: string | null;
  physicalOrderId?: string | null;
  cashfreeOrderId?: string | null;
}): Promise<PhysicalOrder | null> {
  const explicitInternal = params.physicalOrderId?.trim();
  if (explicitInternal) {
    const byInternal = await prisma.physicalOrder.findFirst({
      where: { id: explicitInternal, userId: params.userId },
    });
    if (byInternal) return byInternal;
  }

  const cf = params.cashfreeOrderId?.trim();
  if (cf) {
    const byCf = await prisma.physicalOrder.findFirst({
      where: { cashfreeOrderId: cf, userId: params.userId },
    });
    if (byCf) return byCf;
  }

  const raw = params.orderId?.trim();
  if (!raw) return null;

  if (!looksLikeCashfreeOrderId(raw)) {
    const byUuid = await prisma.physicalOrder.findFirst({
      where: { id: raw, userId: params.userId },
    });
    if (byUuid) return byUuid;
  }

  return prisma.physicalOrder.findFirst({
    where: { cashfreeOrderId: raw, userId: params.userId },
  });
}
