import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/crm/auth";
import { withCrmJson } from "@/lib/crm/api-route";
import { canManageContacts } from "@/lib/crm/contacts/permissions";
import { isValidEmail, normalizePhoneInput } from "@/lib/crm/phone";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
  return { headers, rows };
}

const previewSchema = z.object({
  csv: z.string().min(1),
  mapping: z.record(z.string(), z.string()).optional(),
});

const confirmSchema = z.object({
  jobId: z.string(),
  duplicateMode: z.enum(["skip", "update"]).default("skip"),
});

export async function POST(req: NextRequest) {
  return withCrmJson(async () => {
    const session = await requireCompanyMember();
    if (!canManageContacts(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "preview") {
      const { csv, mapping } = previewSchema.parse(body);
      const { headers, rows } = parseCsv(csv);
      const map = mapping ?? {
        name: headers.find((h) => /name/i.test(h)) ?? headers[0],
        phone: headers.find((h) => /phone|mobile|whatsapp/i.test(h)) ?? headers[1],
        email: headers.find((h) => /email/i.test(h)) ?? "",
        company: headers.find((h) => /company/i.test(h)) ?? "",
      };

      const col = (row: string[], key: string) => {
        const idx = headers.indexOf(map[key as keyof typeof map] ?? key);
        return idx >= 0 ? row[idx]?.trim() ?? "" : "";
      };

      const preview: Record<string, unknown>[] = [];
      const errors: Record<string, unknown>[] = [];

      for (let i = 0; i < Math.min(rows.length, 500); i++) {
        const row = rows[i];
        const name = col(row, "name");
        const phoneRaw = col(row, "phone");
        const { digits, display, valid } = normalizePhoneInput(phoneRaw);
        const email = col(row, "email");

        if (!valid || !name) {
          errors.push({ row: i + 2, reason: !name ? "Missing name" : "Invalid phone", phone: phoneRaw });
          continue;
        }
        if (email && !isValidEmail(email)) {
          errors.push({ row: i + 2, reason: "Invalid email", phone: phoneRaw });
          continue;
        }

        const dup = await prisma.crmContact.findUnique({
          where: { companyId_phoneNormalized: { companyId: session.companyId, phoneNormalized: digits } },
          select: { id: true, name: true },
        });

        preview.push({
          row: i + 2,
          name,
          phone: display,
          email: email || null,
          companyName: col(row, "company") || null,
          duplicate: dup ? { id: dup.id, name: dup.name } : null,
        });
      }

      const job = await prisma.crmContactImportJob.create({
        data: {
          companyId: session.companyId,
          status: "preview",
          fileName: body.fileName ?? "import.csv",
          mapping: map,
          summary: { totalRows: rows.length, valid: preview.length, invalid: errors.length },
          errorReport: errors as Prisma.InputJsonValue,
          createdById: session.memberId,
        },
      });

      await prisma.crmContactImportJob.update({
        where: { id: job.id },
        data: {
          status: "awaiting_confirm",
          summary: {
            totalRows: rows.length,
            valid: preview.length,
            invalid: errors.length,
            previewRows: preview,
          } as Prisma.InputJsonValue,
          errorReport: errors as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        jobId: job.id,
        headers,
        mapping: map,
        preview: preview.slice(0, 50),
        previewTotal: preview.length,
        errors: errors.slice(0, 50),
        errorTotal: errors.length,
        totalRows: rows.length,
      });
    }

    if (action === "confirm") {
      const { jobId, duplicateMode } = confirmSchema.parse(body);
      const job = await prisma.crmContactImportJob.findFirst({
        where: { id: jobId, companyId: session.companyId },
      });
      if (!job || job.status !== "awaiting_confirm") {
        return NextResponse.json({ error: "Import job not ready" }, { status: 400 });
      }

      const summary = job.summary as { previewRows?: Record<string, unknown>[] } | null;
      const rows = summary?.previewRows ?? [];
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const importErrors: Record<string, unknown>[] = [];

      for (const row of rows) {
        const phone = String(row.phone ?? "");
        const { digits, display, valid } = normalizePhoneInput(phone);
        if (!valid) {
          skipped++;
          continue;
        }
        const dup = await prisma.crmContact.findUnique({
          where: { companyId_phoneNormalized: { companyId: session.companyId, phoneNormalized: digits } },
        });
        if (dup) {
          if (duplicateMode === "update") {
            await prisma.crmContact.update({
              where: { id: dup.id },
              data: {
                name: String(row.name ?? dup.name),
                email: row.email ? String(row.email) : dup.email,
                companyName: row.companyName ? String(row.companyName) : dup.companyName,
                source: "csv_import",
                lastActivityAt: new Date(),
              },
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        try {
          await prisma.crmContact.create({
            data: {
              companyId: session.companyId,
              phone: display,
              phoneNormalized: digits,
              name: String(row.name),
              email: row.email ? String(row.email) : null,
              companyName: row.companyName ? String(row.companyName) : null,
              source: "csv_import",
              lastActivityAt: new Date(),
            },
          });
          created++;
        } catch (e) {
          importErrors.push({ phone, error: e instanceof Error ? e.message : "failed" });
        }
      }

      await prisma.crmContactImportJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          summary: { created, updated, skipped, failed: importErrors.length },
          errorReport: importErrors as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({ ok: true, created, updated, skipped, failed: importErrors.length, importErrors });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  });
}
