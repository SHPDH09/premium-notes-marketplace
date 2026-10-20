import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { roundMoney } from "@/lib/pricing";

export async function getShippingSettings() {
  const row =
    (await prisma.shippingSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.shippingSettings.create({
      data: { id: "default" },
    }));
  return row;
}

export async function calculateDeliveryCharge(subtotalAfterDiscount: number): Promise<number> {
  const settings = await getShippingSettings();
  if (!settings.shippingEnabled) return 0;
  const charge = decimalToNumber(settings.deliveryCharge);
  const threshold = settings.freeDeliveryThreshold
    ? decimalToNumber(settings.freeDeliveryThreshold)
    : null;
  if (threshold != null && subtotalAfterDiscount >= threshold) return 0;
  return roundMoney(charge);
}

export function estimateExpectedDelivery(processingDays: number, shippingDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + processingDays + shippingDays);
  return d;
}
