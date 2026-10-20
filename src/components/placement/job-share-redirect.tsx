"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JobShareRedirect({ jobId }: { jobId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/placement?job=${encodeURIComponent(jobId)}`);
  }, [jobId, router]);

  return null;
}
