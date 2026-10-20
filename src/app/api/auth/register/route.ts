import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { zodErrorMessage } from "@/lib/api/zod-error";
import { studentRegisterSchema } from "@/lib/student-register-schema";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`register:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = studentRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const email = parsed.data.email;
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already registered. Try logging in instead." }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone ?? null,
        passwordHash: await hashPassword(parsed.data.password),
        role: "STUDENT",
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("register create user failed", err);
    return NextResponse.json(
      { error: "Could not create account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
