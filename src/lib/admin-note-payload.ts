import { isAllowedStorageKey } from "@/lib/file-limits";
import { DiscountType, NoteStatus } from "@prisma/client";

export type NoteWritePayload = {
  name: string;
  title: string;
  description: string;
  notesLink: string | null;
  price: number;
  discountType: DiscountType;
  discountValue: number;
  status: NoteStatus;
  freePreviewPages: number;
  coverStorageKey: string | null;
  pdfStorageKey: string | null;
};

export function parseNoteWritePayload(raw: Record<string, unknown>): { data?: NoteWritePayload; error?: string } {
  const name = String(raw.name ?? "").trim();
  const title = String(raw.title ?? "").trim();
  const description = String(raw.description ?? "").trim();
  const notesLink = String(raw.notesLink ?? "").trim() || null;
  const price = parseFloat(String(raw.price ?? "0"));
  const discountType = String(raw.discountType ?? "PERCENTAGE") as DiscountType;
  const discountValue = parseFloat(String(raw.discountValue ?? "0"));
  const status = String(raw.status ?? "ACTIVE") as NoteStatus;
  const freePreviewPages = parseInt(String(raw.freePreviewPages ?? "2"), 10) || 2;

  const coverStorageKey =
    raw.coverStorageKey === null || raw.coverStorageKey === undefined
      ? null
      : String(raw.coverStorageKey).trim() || null;
  const pdfStorageKey =
    raw.pdfStorageKey === null || raw.pdfStorageKey === undefined
      ? null
      : String(raw.pdfStorageKey).trim() || null;

  if (!name || !title || !description || Number.isNaN(price)) {
    return { error: "Missing required fields" };
  }

  if (coverStorageKey && !isAllowedStorageKey(coverStorageKey, "covers")) {
    return { error: "Invalid cover storage key" };
  }
  if (pdfStorageKey && !isAllowedStorageKey(pdfStorageKey, "pdfs")) {
    return { error: "Invalid PDF storage key" };
  }

  return {
    data: {
      name,
      title,
      description,
      notesLink,
      price,
      discountType,
      discountValue,
      status,
      freePreviewPages,
      coverStorageKey,
      pdfStorageKey,
    },
  };
}
