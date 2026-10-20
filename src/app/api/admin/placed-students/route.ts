import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializePlacedStudent } from "@/lib/placement/serialize";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { PublishStatus } from "@prisma/client";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const rows = await prisma.placedStudent.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    placedStudents: rows.map((r) => ({
      ...serializePlacedStudent(r),
      userId: r.userId,
      studentEmail: r.user?.email ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const displayName = String(form.get("displayName") ?? "").trim();
  const company = String(form.get("company") ?? "").trim();
  const role = String(form.get("role") ?? "").trim() || null;
  const packageLabel = String(form.get("packageLabel") ?? "").trim() || null;
  const story = String(form.get("story") ?? "").trim() || null;
  const userId = String(form.get("userId") ?? "").trim() || null;
  const status = String(form.get("status") ?? "ACTIVE") as PublishStatus;
  const sortOrder = parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0;

  if (!displayName || !company) {
    return NextResponse.json({ error: "Name and company are required" }, { status: 400 });
  }

  let photoKey: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const err = validateImageFile(photo);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await photo.arrayBuffer());
    const uploaded = await uploadFile(buf, photo.type, "covers");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    photoKey = uploaded.key;
  }

  const row = await prisma.placedStudent.create({
    data: {
      displayName,
      company,
      role,
      packageLabel,
      story,
      userId,
      photo: photoKey,
      status,
      sortOrder,
    },
  });

  return NextResponse.json({ placedStudent: serializePlacedStudent(row) }, { status: 201 });
}
