import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth-helpers";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { CollaboratorType, PublishStatus } from "@prisma/client";
import { isAllowedStorageKey } from "@/lib/file-limits";

export const runtime = "nodejs";

const VALID_TYPES: CollaboratorType[] = ["COMPANY", "COLLEGE", "INSTITUTE"];

function parseType(value: string): CollaboratorType {
  const upper = value.toUpperCase();
  if (VALID_TYPES.includes(upper as CollaboratorType)) return upper as CollaboratorType;
  return "COMPANY";
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const type = req.nextUrl.searchParams.get("type");

    const items = await prisma.collaborator.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(type && type !== "all" ? { type: parseType(type) } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ collaborators: items.map(serializeCollaborator) });
  } catch (e) {
    console.error("admin collaborators GET", e);
    const message = e instanceof Error ? e.message : "Failed to load collaborators";
    return NextResponse.json({ error: message, collaborators: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      const name = String(body.name ?? "").trim();
      const type = parseType(String(body.type ?? "COMPANY"));
      const website = String(body.website ?? "").trim() || null;
      const description = String(body.description ?? "").trim() || null;
      const statusRaw = String(body.status ?? "ACTIVE").toUpperCase();
      const status: PublishStatus = statusRaw === "DISABLED" ? "DISABLED" : "ACTIVE";
      const sortOrder = parseInt(String(body.sortOrder ?? "0"), 10) || 0;
      const logoStorageKey = body.logoStorageKey ? String(body.logoStorageKey).trim() : null;

      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      if (logoStorageKey && !isAllowedStorageKey(logoStorageKey, "covers")) {
        return NextResponse.json({ error: "Invalid logo storage key" }, { status: 400 });
      }

      const item = await prisma.collaborator.create({
        data: {
          name,
          type,
          logoImage: logoStorageKey,
          website,
          description,
          status,
          sortOrder,
        },
      });

      return NextResponse.json({ collaborator: serializeCollaborator(item) }, { status: 201 });
    }

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const type = parseType(String(form.get("type") ?? "COMPANY"));
    const website = String(form.get("website") ?? "").trim() || null;
    const description = String(form.get("description") ?? "").trim() || null;
    const statusRaw = String(form.get("status") ?? "ACTIVE").toUpperCase();
    const status: PublishStatus = statusRaw === "DISABLED" ? "DISABLED" : "ACTIVE";
    const sortOrder = parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    let logoKey: string | null = null;
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
        logoKey = uploaded.key;
      }
    }

    const item = await prisma.collaborator.create({
      data: { name, type, logoImage: logoKey, website, description, status, sortOrder },
    });

    return NextResponse.json(
      {
        collaborator: serializeCollaborator(item),
        warning: logoWarning,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("admin collaborators POST", e);
    const message = e instanceof Error ? e.message : "Failed to create collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
