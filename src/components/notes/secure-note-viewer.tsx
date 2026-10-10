"use client";

import { useEffect, useState } from "react";
import { BrandLoading } from "@/components/brand/brand-loading";
import { cn } from "@/lib/utils";

export function SecureNoteViewer(props: {
  streamUrl: string;
  watermark: string;
  className?: string;
  title?: string;
}) {
  const label = props.watermark || "Licensed copy";
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(props.streamUrl, { credentials: "include", cache: "no-store" });
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("pdf")) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not load PDF. Try signing in again.");
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF");
          setBlobUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [props.streamUrl]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner",
        props.className
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-8 p-4 opacity-[0.14]">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="rotate-[-22deg] whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-900"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-0 min-h-[min(80vh,720px)] bg-white">
        {error ? (
          <p className="flex h-[min(50vh,400px)] items-center justify-center px-4 text-center text-sm text-red-600">
            {error}
          </p>
        ) : !blobUrl ? (
          <BrandLoading fullPage message="Loading PDF…" size="md" />
        ) : (
          <embed
            title={props.title ?? "Protected notes viewer"}
            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="h-[min(80vh,720px)] w-full"
          />
        )}
      </div>
      <p className="relative z-20 border-t border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-500">
        View-only in your account. Sharing, downloading, and copying are not permitted.
      </p>
    </div>
  );
}
