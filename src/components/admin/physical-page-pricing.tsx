"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import {
  computeFinalPhysicalPrice,
  printingCostFromPerPage,
  pricePerPageFromPrintingCost,
} from "@/lib/physical/page-pricing";

export type PhysicalPricingFormSlice = {
  pageCount: number;
  printingCost: number;
  bindingCost: number;
  packagingCost: number;
  basePrice: number;
  finalPrice?: number;
};

type Props = {
  /** PDF page count from linked note (read-only reference). */
  noteTotalPages: number | null;
  value: PhysicalPricingFormSlice;
  onChange: (next: PhysicalPricingFormSlice & { pricePerPage?: number }) => void;
  showFinalPreview?: boolean;
};

export function PhysicalPagePricingFields({
  noteTotalPages,
  value,
  onChange,
  showFinalPreview = true,
}: Props) {
  const pages = Math.max(0, Math.floor(value.pageCount) || 0);
  const pricePerPage = pricePerPageFromPrintingCost(pages, value.printingCost);

  function setPages(raw: number) {
    const pageCount = Math.max(1, Math.floor(raw) || 1);
    const printingCost = printingCostFromPerPage(pageCount, pricePerPage);
    onChange({ ...value, pageCount, printingCost });
  }

  function setPricePerPage(raw: number) {
    const ppp = Math.max(0, raw);
    const printingCost = printingCostFromPerPage(pages, ppp);
    onChange({ ...value, pageCount: pages || 1, printingCost, pricePerPage: ppp });
  }

  function setPrintingCost(raw: number) {
    onChange({ ...value, printingCost: Math.max(0, raw) });
  }

  const finalPreview = computeFinalPhysicalPrice(value);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Print pricing (per page)</p>
        <p className="text-xs text-slate-500">
          Set price per page; printing cost = pages × rate. Use note total pages when linked.
        </p>
      </div>

      {noteTotalPages != null && noteTotalPages > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm">
          <span className="font-medium text-indigo-900">Note total pages (PDF):</span>
          <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-indigo-700">
            {noteTotalPages}
          </span>
          {pages !== noteTotalPages && (
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 underline"
              onClick={() => setPages(noteTotalPages)}
            >
              Use {noteTotalPages} pages for pricing
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Pages for this print job</Label>
          <Input
            type="number"
            min={1}
            value={pages || ""}
            onChange={(e) => setPages(parseInt(e.target.value, 10))}
          />
        </div>
        <div>
          <Label>Price per page (₹)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={pricePerPage || ""}
            onChange={(e) => setPricePerPage(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Printing cost (total)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={value.printingCost}
            onChange={(e) => setPrintingCost(parseFloat(e.target.value) || 0)}
          />
          {pages > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {pages} pages × {formatCurrency(pricePerPage)}/page ={" "}
              <strong>{formatCurrency(printingCostFromPerPage(pages, pricePerPage))}</strong>
            </p>
          )}
        </div>
        {(
          [
            ["bindingCost", "Binding cost"],
            ["packagingCost", "Packaging cost"],
            ["basePrice", "Other base charge"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        ))}
      </div>

      {showFinalPreview && (
        <p className="text-sm font-semibold text-slate-800">
          Final price per copy (preview): {formatCurrency(finalPreview)}
        </p>
      )}
    </div>
  );
}
