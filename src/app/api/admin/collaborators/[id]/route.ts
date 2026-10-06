import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { deleteStoredFile, uploadFile, validateImageFile } from "@/lib/storage";
import { CollaboratorType, PublishStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.collaborator.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { status?: PublishStatus; sortOrder?: number };
    const item = await prisma.collaborator.update({
      where: { id: params.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return NextResponse.json({ collaborator: serializeCollaborator(item) });
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? existing.name).trim();
  const type = String(form.get("type") ?? existing.type) as CollaboratorType;
  const websiteRaw = form.get("website");
  const website =
    websiteRaw === null ? existing.website : String(websiteRaw).trim() || null;
  const descriptionRaw = form.get("description");
  const description =
    descriptionRaw === null ? existing.description : String(descriptionRaw).trim() || null;
  const status = String(form.get("status") ?? existing.status) as PublishStatus;
  const sortOrder = parseInt(String(form.get("sortOrder") ?? existing.sortOrder), 10) || 0;

  let logoKey = existing.logoImage;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const err = validateImageFile(logo);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await logo.arrayBuffer());
    const uploaded = await uploadFile(buf, logo.type, "covers");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    if (existing.logoImage) await deleteStoredFile(existing.logoImage);
    logoKey = uploaded.key;
  }

  const item = await prisma.collaborator.update({
    where: { id: params.id },
    data: { name, type, logoImage: logoKey, website, description, status, sortOrder },
  });

  return NextResponse.json({ collaborator: serializeCollaborator(item) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.collaborator.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.collaborator.delete({ where: { id: params.id } });
  if (existing.logoImage) await deleteStoredFile(existing.logoImage);

  return NextResponse.json({ ok: true });
}
