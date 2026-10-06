import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { CollaboratorType, PublishStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type");

  const items = await prisma.collaborator.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(type && type !== "all" ? { type: type as CollaboratorType } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ collaborators: items.map(serializeCollaborator) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "COMPANY") as CollaboratorType;
  const website = String(form.get("website") ?? "").trim() || null;
  const description = String(form.get("description") ?? "").trim() || null;
  const status = (String(form.get("status") ?? "ACTIVE") as PublishStatus);
  const sortOrder = parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  let logoKey: string | null = null;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const err = validateImageFile(logo);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const buf = Buffer.from(await logo.arrayBuffer());
    const uploaded = await uploadFile(buf, logo.type, "covers");
    if (uploaded.error) return NextResponse.json({ error: uploaded.error }, { status: 500 });
    logoKey = uploaded.key;
  }

  const item = await prisma.collaborator.create({
    data: { name, type, logoImage: logoKey, website, description, status, sortOrder },
  });

  return NextResponse.json({ collaborator: serializeCollaborator(item) }, { status: 201 });
}
