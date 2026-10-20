"use client";

import { cn } from "@/lib/utils";
import { ProtectedPdfCanvasViewer } from "@/components/notes/protected-pdf-canvas-viewer";

export function SecureNoteViewer(props: {
  streamUrl: string;
  watermark: string;
  className?: string;
  title?: string;
}) {
  return (
    <ProtectedPdfCanvasViewer
      streamUrl={props.streamUrl}
      watermark={props.watermark}
      title={props.title}
      className={cn(props.className)}
    />
  );
}
