"use client";

import { Button } from "@/components/ui/button";
import { BrandLoading } from "@/components/brand/brand-loading";
import { PremiumInvoiceDocument } from "@/components/invoice/premium-invoice-document";
import type { InvoiceDocumentData } from "@/lib/invoice/types";

export function InvoicePageShell({
  invoice,
  loading,
  error,
}: {
  invoice: InvoiceDocumentData | null;
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <BrandLoading fullPage size="lg" message="Preparing your official bill…" />;
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-slate-600">{error ?? "Invoice not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-3xl justify-end gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>
      <PremiumInvoiceDocument invoice={invoice} />
    </div>
  );
}
