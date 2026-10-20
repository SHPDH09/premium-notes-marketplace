import { z } from "zod";
import { roundMoney } from "@/lib/pricing";

const schema = z.object({
  sourceNoteId: z.string().nullable().optional(),
  name: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(10),
  coverStorageKey: z.string().nullable().optional(),
  sourcePdfKey: z.string().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  paperSize: z.enum(["A4", "A5", "OTHER"]).default("A4"),
  paperType: z.enum(["NORMAL", "PREMIUM"]).default("NORMAL"),
  printType: z.enum(["BLACK_WHITE", "COLOR"]).default("BLACK_WHITE"),
  bindingType: z.enum(["NONE", "SPIRAL", "SOFT_BINDING", "HARD_BINDING"]).default("NONE"),
  printingCost: z.number().min(0).default(0),
  bindingCost: z.number().min(0).default(0),
  packagingCost: z.number().min(0).default(0),
  basePrice: z.number().min(0).default(0),
  finalPrice: z.number().min(0).optional(),
  priceOverride: z.boolean().default(false),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).default(10),
  processingDays: z.number().int().min(1).default(2),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export function parsePhysicalDocumentPayload(body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: "Invalid document payload", data: null };
  const p = parsed.data;
  const computed = roundMoney(p.printingCost + p.bindingCost + p.packagingCost + p.basePrice);
  const finalPrice = p.priceOverride && p.finalPrice != null ? roundMoney(p.finalPrice) : computed;
  return {
    error: null as string | null,
    data: { ...p, finalPrice },
  };
}
