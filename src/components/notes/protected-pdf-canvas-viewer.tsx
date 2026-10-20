"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandLoading } from "@/components/brand/brand-loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadPdfDocument } from "@/lib/pdfjs-client";
import type { PDFDocumentProxy } from "pdfjs-dist";

function drawWatermark(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 13px system-ui, sans-serif";
  const stepX = Math.max(160, width / 3);
  const stepY = Math.max(72, height / 6);
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.35);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function ProtectedPdfCanvasViewer(props: {
  streamUrl: string;
  watermark: string;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [shielded, setShielded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const watermarkLine =
    props.watermark.trim() || "Licensed — do not share";

  const renderPage = useCallback(
    async (pageNum: number) => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!doc || !canvas || !container) return;

      setRendering(true);
      try {
        const pdfPage = await doc.getPage(pageNum);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const maxWidth = container.clientWidth || 360;
        const scale = Math.min(Math.max(maxWidth / baseViewport.width, 0.5), 2.5);
        const viewport = pdfPage.getViewport({ scale });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);

        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        drawWatermark(ctx, watermarkLine, viewport.width, viewport.height);
      } finally {
        setRendering(false);
      }
    },
    [watermarkLine]
  );

  useEffect(() => {
    let cancelled = false;
    docRef.current = null;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(props.streamUrl, { credentials: "include", cache: "no-store" });
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("pdf")) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not load PDF");
        }
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const doc = await loadPdfDocument(buffer);
        if (cancelled) return;
        docRef.current = doc;
        setTotalPages(doc.numPages);
        setPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [props.streamUrl]);

  useEffect(() => {
    if (loading || error || !docRef.current) return;
    void renderPage(page);
  }, [page, loading, error, renderPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      if (docRef.current) void renderPage(page);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [page, renderPage]);

  useEffect(() => {
    const shield = () => setShielded(document.hidden);
    const onBlur = () => setShielded(true);
    const onFocus = () => setShielded(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setShielded(true);
        window.setTimeout(() => setShielded(false), 2000);
      }
    };

    document.addEventListener("visibilitychange", shield);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keyup", onKey);

    return () => {
      document.removeEventListener("visibilitychange", shield);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const minHeight = props.compact ? "min-h-[14rem]" : "min-h-[420px] sm:min-h-[520px] lg:min-h-[560px]";

  return (
    <div
      className={cn(
        "protected-pdf-viewer relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5",
        props.className
      )}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      <div
        className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-6 p-2 opacity-[0.08]">
          {Array.from({ length: props.compact ? 4 : 10 }).map((_, i) => (
            <span
              key={i}
              className="rotate-[-22deg] whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-900 sm:text-xs"
            >
              {watermarkLine}
            </span>
          ))}
        </div>
      </div>

      {shielded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/85 px-6 text-center text-sm font-medium text-white backdrop-blur-md">
          Content hidden — return to this tab to continue reading
        </div>
      )}

      <div
        ref={containerRef}
        className={cn("relative z-10 flex justify-center bg-white px-1 py-3", minHeight)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const dx = end - start;
          if (dx > 55) setPage((p) => Math.max(1, p - 1));
          else if (dx < -55) setPage((p) => Math.min(totalPages, p + 1));
        }}
      >
        {loading ? (
          <BrandLoading size={props.compact ? "sm" : "md"} message="Loading protected PDF…" />
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>
        ) : (
          <canvas
            ref={canvasRef}
            className="max-w-full touch-manipulation select-none shadow-sm"
            aria-label={props.title ?? "Protected PDF page"}
            draggable={false}
          />
        )}
        {rendering && !loading && (
          <div className="pointer-events-none absolute inset-0 z-[5] bg-white/40" aria-hidden />
        )}
      </div>

      {!loading && !error && totalPages > 0 && (
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 min-w-[44px] touch-manipulation"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
          </Button>
          <p className="text-center text-xs text-slate-600 sm:text-sm">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 min-w-[44px] touch-manipulation"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!props.compact && (
        <p className="relative z-20 border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-[11px] leading-snug text-slate-500">
          Protected view (mobile &amp; desktop). PDF is rendered in-app with your licensed watermark.
          OS-level screenshots cannot be fully blocked on the web; leaked copies can be traced to your
          account.
        </p>
      )}
    </div>
  );
}
