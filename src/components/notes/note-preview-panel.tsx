"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLoading } from "@/components/brand/brand-loading";
import { ProtectedPdfCanvasViewer } from "@/components/notes/protected-pdf-canvas-viewer";
import { formatCurrency } from "@/lib/utils";

type PreviewData = {
  owned: boolean;
  url?: string;
  freePages: number;
  totalPages: number | null;
  lockedPages: number | null;
  finalPrice?: string;
  title?: string;
};

export function NotePreviewPanel({
  noteId,
  compact = false,
}: {
  noteId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/preview`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setData(null);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }, [noteId]);

  function goToPayment() {
    router.push(`/notes/${noteId}/payment`);
  }

  if (loading) {
    return (
      <BrandLoading
        size={compact ? "sm" : "md"}
        className={compact ? "h-48 w-full" : "h-72 w-full"}
        message="Loading preview…"
      />
    );
  }

  if (!data?.url && !data?.owned) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        PDF preview will appear after admin uploads a notes PDF.
      </div>
    );
  }

  const free = data?.freePages ?? 2;
  const total = data?.totalPages;
  const locked = data?.lockedPages ?? (total ? Math.max(0, total - free) : null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {data?.owned ? (
          <Badge variant="success" className="gap-1">
            <Unlock className="h-3 w-3" /> Full access unlocked
          </Badge>
        ) : (
          <Badge className="gap-1">
            {free} page{free > 1 ? "s" : ""} free preview
          </Badge>
        )}
        {!data?.owned && total != null && locked != null && locked > 0 && (
          <span className="text-xs text-slate-500">
            {locked} more page{locked > 1 ? "s" : ""} locked
          </span>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner"
        onContextMenu={(e) => e.preventDefault()}
      >
        {data?.url && (
          <ProtectedPdfCanvasViewer
            streamUrl={data.url}
            title="Notes preview"
            compact={compact}
            watermark="TechLaunchpad — preview only"
          />
        )}

        {!data?.owned && (
          <button
            type="button"
            onClick={goToPayment}
            className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-between gap-2 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent px-4 pb-4 pt-16 text-left text-white transition hover:from-indigo-900/95"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Remaining pages are locked</p>
                <p className="text-xs text-white/80">Pay once to unlock the full PDF forever</p>
              </div>
            </div>
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-indigo-700">
              Unlock
            </span>
          </button>
        )}
      </div>

      {!data?.owned && data?.finalPrice && (
        <Button className="w-full" onClick={goToPayment}>
          Unlock full notes — {formatCurrency(data.finalPrice)}
        </Button>
      )}
    </div>
  );
}
