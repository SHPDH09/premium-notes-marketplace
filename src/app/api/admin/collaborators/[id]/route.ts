import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { deleteStoredFile, uploadFile, validateImageFile } from "@/lib/storage";
import { CollaboratorType, PublishStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TYPES: CollaboratorType[] = ["COMPANY", "COLLEGE", "INSTITUTE"];

function parseType(value: string): CollaboratorType {
  const upper = value.toUpperCase();
  if (VALID_TYPES.includes(upper as CollaboratorType)) return upper as CollaboratorType;
  return "COMPANY";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
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
    const type = parseType(String(form.get("type") ?? existing.type));
    const websiteRaw = form.get("website");
    const website =
      websiteRaw === null ? existing.website : String(websiteRaw).trim() || null;
    const descriptionRaw = form.get("description");
    const description =
      descriptionRaw === null ? existing.description : String(descriptionRaw).trim() || null;
    const statusRaw = String(form.get("status") ?? existing.status).toUpperCase();
    const status: PublishStatus = statusRaw === "DISABLED" ? "DISABLED" : "ACTIVE";
    const sortOrder = parseInt(String(form.get("sortOrder") ?? existing.sortOrder), 10) || 0;

    let logoKey = existing.logoImage;
    let logoWarning: string | undefined;
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const err = validateImageFile(logo);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      const buf = Buffer.from(await logo.arrayBuffer());
      const uploaded = await uploadFile(buf, logo.type, "covers");
      if (uploaded.error) {
        logoWarning = uploaded.error;
      } else {
        if (existing.logoImage) await deleteStoredFile(existing.logoImage);
        logoKey = uploaded.key;
      }
    }

    const item = await prisma.collaborator.update({
      where: { id: params.id },
      data: { name, type, logoImage: logoKey, website, description, status, sortOrder },
    });

    return NextResponse.json({
      collaborator: serializeCollaborator(item),
      warning: logoWarning,
    });
  } catch (e) {
    console.error("admin collaborators PATCH", e);
    const message = e instanceof Error ? e.message : "Failed to update collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const existing = await prisma.collaborator.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.collaborator.delete({ where: { id: params.id } });
    if (existing.logoImage) await deleteStoredFile(existing.logoImage);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin collaborators DELETE", e);
    const message = e instanceof Error ? e.message : "Failed to delete collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
