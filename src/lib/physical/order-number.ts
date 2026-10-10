import { prisma } from "@/lib/db";

/** PHY-YYYYMMDD-000123 */
export async function generatePhysicalOrderNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = `PHY-${y}${m}${day}-`;

  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const orderNumber = `${prefix}${seq}`;
    const exists = await prisma.physicalOrder.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (!exists) return orderNumber;
  }
  throw new Error("Unable to generate order number.");
}
