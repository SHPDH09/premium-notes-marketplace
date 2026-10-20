import { prisma } from "@/lib/db";

export async function userHasActivePlacementSubscription(userId: string): Promise<boolean> {
  const now = new Date();
  const sub = await prisma.userPlacementSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  return !!sub;
}

export async function getActivePlacementSubscription(userId: string) {
  const now = new Date();
  return prisma.userPlacementSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}
