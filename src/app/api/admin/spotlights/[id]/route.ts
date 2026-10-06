import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";
import { deleteStoredFile, uploadFile, validateImageFile } from "@/lib/storage";
import { PublishStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.studentSpotlight.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const displayName = String(form.get("displayName") ?? existing.displayName).trim();
  const institute = String(form.get("institute") ?? existing.institute ?? "").trim() || null;
  const headline = String(form.get("headline") ?? existing.headline ?? "").trim() || null;
  const quote = String(form.get("quote") ?? existing.quote ?? "").trim() || null;
  const status = String(form.get("status") ?? existing.status) as PublishStatus;
  const sortOrder = parseInt(String(form.get("sortOrder") ?? existing.sortOrder), 10) || 0;

  let photo = existing.photo;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    const err = validateImageFile(file);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(buf, file.type, "covers");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    if (existing.photo && !existing.photo.startsWith("http")) {
      await deleteStoredFile(existing.photo);
    }
    photo = uploaded.key;
  }

  const photoUrl = form.get("photoUrl");
  if (photoUrl !== null) {
    const url = String(photoUrl).trim();
    if (url) photo = url;
  }

  const item = await prisma.studentSpotlight.update({
    where: { id: params.id },
    data: { displayName, institute, headline, quote, photo, status, sortOrder },
  });

  return NextResponse.json({ spotlight: serializeSpotlight(item) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.studentSpotlight.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studentSpotlight.delete({ where: { id: params.id } });
  if (existing.photo && !existing.photo.startsWith("http")) {
    await deleteStoredFile(existing.photo);
  }

  return NextResponse.json({ ok: true });
}
