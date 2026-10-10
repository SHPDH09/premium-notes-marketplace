"use client";

import { cn } from "@/lib/utils";

export function SecureNoteViewer(props: {
  streamUrl: string;
  watermark: string;
  className?: string;
  title?: string;
}) {
  const label = props.watermark || "Licensed copy";

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
      <iframe
        title={props.title ?? "Protected notes viewer"}
        src={`${props.streamUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        className="relative z-0 h-[min(80vh,720px)] w-full bg-white"
        sandbox="allow-same-origin allow-scripts"
        referrerPolicy="no-referrer"
      />
      <p className="border-t border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-500">
        View-only in your account. Sharing, downloading, and copying are not permitted.
      </p>
    </div>
  );
}
