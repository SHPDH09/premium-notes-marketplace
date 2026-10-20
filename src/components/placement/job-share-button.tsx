"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildJobSharePayload } from "@/lib/placement/job-share-url";

export function JobShareButton({
  job,
  size = "sm",
  variant = "outline",
}: {
  job: { id: string; title: string; company: string; location?: string | null };
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [sharing, setSharing] = useState(false);

  async function shareJob() {
    setSharing(true);
    try {
      const { url, title, text } = buildJobSharePayload(job);

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url });
          toast.success("Shared");
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copied — paste in WhatsApp, Telegram, etc.");
    } catch {
      toast.error("Could not share. Copy the link from the address bar after opening the job.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={sharing}
      onClick={() => void shareJob()}
      aria-label={`Share ${job.title}`}
    >
      <Share2 className="mr-1.5 h-4 w-4" />
      {sharing ? "…" : "Share"}
    </Button>
  );
}
