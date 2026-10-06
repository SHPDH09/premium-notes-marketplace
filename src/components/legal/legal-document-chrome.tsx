"use client";

import { Printer } from "lucide-react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";

export function LegalDocumentChrome({
  docTitle,
  lastUpdated,
}: {
  docTitle: string;
  lastUpdated: string;
}) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 py-5 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-lg font-bold text-white shadow-lg backdrop-blur-sm">
          {brand.logoText}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">{brand.name}</p>
          <p className="text-lg font-semibold text-white">{docTitle}</p>
          <p className="text-xs text-indigo-100/90">Last updated {lastUpdated}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="gap-2 bg-white/95 text-indigo-700 hover:bg-white"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
