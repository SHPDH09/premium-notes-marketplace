import { prisma } from "@/lib/db";

/** New login invalidates all other devices for this account. */
export async function rotateUserSession(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return user.sessionVersion;
}

export async function isSessionVersionValid(
  userId: string,
  sessionVersion: number | undefined | null
): Promise<boolean> {
  if (sessionVersion == null || !Number.isFinite(sessionVersion)) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return false;
  return user.sessionVersion === sessionVersion;
}
