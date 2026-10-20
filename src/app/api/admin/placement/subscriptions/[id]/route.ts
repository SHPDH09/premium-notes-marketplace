import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminJson } from "@/lib/api/admin-route";
import { prisma } from "@/lib/db";
import { PlacementSubscriptionStatus } from "@prisma/client";

const patchSchema = z.object({
  status: z.nativeEnum(PlacementSubscriptionStatus),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const sub = await prisma.userPlacementSubscription.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({
      subscription: {
        id: sub.id,
        status: sub.status,
      },
    });
  });
}
