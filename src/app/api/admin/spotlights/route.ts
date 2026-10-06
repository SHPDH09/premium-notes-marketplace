import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { PublishStatus } from "@prisma/client";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const items = await prisma.studentSpotlight.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    spotlights: items.map((s) => ({
      ...serializeSpotlight(s),
      studentEmail: s.user?.email,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const displayName = String(form.get("displayName") ?? "").trim();
  const userId = String(form.get("userId") ?? "").trim() || null;
  const institute = String(form.get("institute") ?? "").trim() || null;
  const headline = String(form.get("headline") ?? "").trim() || null;
  const quote = String(form.get("quote") ?? "").trim() || null;
  const status = (String(form.get("status") ?? "ACTIVE") as PublishStatus);
  const sortOrder = parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0;

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
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

  const photoUrl = String(form.get("photoUrl") ?? "").trim();
  const finalPhoto = photoKey ?? (photoUrl || null);

  const item = await prisma.studentSpotlight.create({
    data: {
      displayName,
      userId,
      institute,
      headline,
      quote,
      photo: finalPhoto,
      status,
      sortOrder,
    },
  });

  return NextResponse.json({ spotlight: serializeSpotlight(item) }, { status: 201 });
}
