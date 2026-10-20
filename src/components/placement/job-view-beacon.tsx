"use client";

import { useEffect, useRef } from "react";
import { recordJobViewOnce } from "@/hooks/use-record-job-view";

export function JobViewBeacon({ jobId }: { jobId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          recordJobViewOnce(jobId);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [jobId]);

  return <div ref={ref} className="pointer-events-none h-0 w-full" aria-hidden />;
}
