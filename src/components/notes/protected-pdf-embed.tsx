"use client";

import { useEffect, useState } from "react";
import { BrandLoading } from "@/components/brand/brand-loading";
import { cn } from "@/lib/utils";

/** Loads a same-origin PDF stream and displays it (Chrome-safe, no sandbox iframe). */
export function ProtectedPdfEmbed(props: {
  streamUrl: string;
  className?: string;
  heightClass?: string;
  title?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const height = props.heightClass ?? "h-80";

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(props.streamUrl, { credentials: "include", cache: "no-store" });
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("pdf")) {
          throw new Error("Preview unavailable");
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setError("Preview unavailable");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [props.streamUrl]);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500", height, props.className)}>
        {error}
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={cn("flex items-center justify-center", height, props.className)}>
        <BrandLoading size="sm" message="Loading preview…" />
      </div>
    );
  }

  return (
    <embed
      title={props.title ?? "Notes preview"}
      src={`${blobUrl}#toolbar=0&navpanes=0`}
      type="application/pdf"
      className={cn("w-full bg-white", height, props.className)}
    />
  );
}
