"use client";

import { useEffect } from "react";

export function useRecordJobView(jobId: string | undefined) {
  useEffect(() => {
    if (!jobId || typeof window === "undefined") return;
    const key = `tl-job-view-${jobId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/placement/jobs/${jobId}/view`, { method: "POST" }).catch(() => {});
  }, [jobId]);
}

export function recordJobViewOnce(jobId: string) {
  if (typeof window === "undefined") return;
  const key = `tl-job-view-${jobId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  fetch(`/api/placement/jobs/${jobId}/view`, { method: "POST" }).catch(() => {});
}
