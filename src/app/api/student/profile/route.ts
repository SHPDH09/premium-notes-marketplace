import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.session!.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
    },
  });
}

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  profileImage: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireStudent();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.session!.user.id },
    data: parsed.data,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
    },
  });
}
