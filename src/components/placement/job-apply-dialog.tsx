"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildMailtoUrl } from "@/lib/placement/mailto";
import { ExternalLink, Mail, MapPin, X } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  applyType: "EMAIL" | "LINK" | "WALK_IN";
  applyUrl?: string | null;
  walkInDetails?: string | null;
};

export function JobApplyDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{
    to: string;
    subject: string;
    body: string;
    source: string;
    hasResumeFile: boolean;
  } | null>(null);

  if (!open || !job) return null;

  async function prepareEmailApply() {
    setLoading(true);
    setEmailDraft(null);
    try {
      const res = await fetch("/api/student/placement/generate-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job!.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not prepare application email");
        return;
      }
      setEmailDraft(data);
      if (data.source === "template") {
        toast.message("Using built-in template. Add PLACEMENT_OPENAI_API_KEY on Vercel for AI emails.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadResume() {
    const res = await fetch("/api/student/placement/resume/download", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Upload resume in Profile → Placement first");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
    toast.success("Download your resume PDF and attach it in the email app.");
  }

  function openMailApp() {
    if (!emailDraft) return;
    window.location.href = buildMailtoUrl(emailDraft.to, emailDraft.subject, emailDraft.body);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Apply — {job.title}</h2>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {job.applyType === "LINK" && job.applyUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">You will be redirected to the official application page.</p>
            <Button asChild className="w-full">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open apply link
              </a>
            </Button>
          </div>
        ) : null}

        {job.applyType === "WALK_IN" ? (
          <div className="space-y-3 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-indigo-600" />
              Walk-in details
            </p>
            <p className="whitespace-pre-wrap">{job.walkInDetails}</p>
          </div>
        ) : null}

        {job.applyType === "EMAIL" ? (
          <div className="space-y-4">
            {!emailDraft ? (
              <Button className="w-full" disabled={loading} onClick={() => void prepareEmailApply()}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Generating email…" : "Generate application email"}
              </Button>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Browsers cannot auto-attach files to email. We pre-fill the message; attach the same resume from
                  your profile.
                </p>
                <div className="rounded-lg border bg-white p-3 text-sm">
                  <p className="font-medium text-slate-900">To: {emailDraft.to}</p>
                  <p className="mt-2 font-medium">Subject: {emailDraft.subject}</p>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                    {emailDraft.body}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  {emailDraft.hasResumeFile ? (
                    <Button type="button" variant="secondary" onClick={() => void downloadResume()}>
                      Download my resume (attach in email)
                    </Button>
                  ) : (
                    <p className="text-xs text-amber-800">
                      Upload a resume under Profile → Placement before sending.
                    </p>
                  )}
                  <Button type="button" onClick={openMailApp}>
                    Open email app with message
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
