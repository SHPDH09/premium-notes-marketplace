import type { Prisma } from "@prisma/client";

/** Jobs shown on the public placement board. */
export const publicJobBoardWhere: Prisma.JobPostingWhereInput = {
  status: "ACTIVE",
  OR: [{ source: "ADMIN" }, { reviewStatus: "VERIFIED" }],
};
