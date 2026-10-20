import { z } from "zod";
import { JobApplyType } from "@prisma/client";

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const jobPostingInputSchema = z
  .object({
    title: z.string().min(2),
    company: z.string().min(1),
    location: z.string().nullable().optional(),
    applyType: z.nativeEnum(JobApplyType),
    description: z.string().min(10),
    applyEmail: z.string().email().nullable().optional(),
    applyUrl: z
      .string()
      .nullable()
      .optional()
      .transform((v) => normalizeOptionalUrl(v)),
    applyPhone: z.string().min(8).max(32).nullable().optional(),
    walkInDetails: z.string().nullable().optional(),
    requiresSubscription: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.applyType === "EMAIL" && !d.applyEmail) {
      ctx.addIssue({ code: "custom", message: "Apply email is required", path: ["applyEmail"] });
    }
    if (d.applyType === "LINK" && !d.applyUrl) {
      ctx.addIssue({ code: "custom", message: "Apply URL is required", path: ["applyUrl"] });
    }
    if (d.applyType === "WALK_IN" && !d.walkInDetails?.trim()) {
      ctx.addIssue({ code: "custom", message: "Walk-in details are required", path: ["walkInDetails"] });
    }
    if ((d.applyType === "CALL" || d.applyType === "WHATSAPP") && !d.applyPhone?.trim()) {
      ctx.addIssue({ code: "custom", message: "Phone / WhatsApp number is required", path: ["applyPhone"] });
    }
  });

export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;
