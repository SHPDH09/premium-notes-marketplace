"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildMailtoUrl } from "@/lib/placement/mailto";
import { formatAppliedAt } from "@/lib/placement/format-applied-at";
import { shareApplicationViaWhatsApp } from "@/lib/placement/share-resume-via-whatsapp";
import { buildTelUrl } from "@/lib/placement/whatsapp-apply-url";
import Link from "next/link";
import { ExternalLink, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";

type JobApplyType = "EMAIL" | "LINK" | "WALK_IN" | "CALL" | "WHATSAPP";

type Job = {
  id: string;
  title: string;
  company: string;
  applyType: JobApplyType;
  applyUrl?: string | null;
  applyPhone?: string | null;
  walkInDetails?: string | null;
  appliedAt?: string | null;
};

type ApplicationChannel =
  | "EMAIL_GMAIL"
  | "EMAIL_MAILTO"
  | "EXTERNAL_LINK"
  | "WALK_IN"
  | "CALL"
  | "WHATSAPP";

export function JobApplyDialog({
  job,
  open,
  onOpenChange,
  onApplied,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApplied?: (jobId: string, appliedAt: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [emailDraft, setEmailDraft] = useState<{
    to: string;
    subject: string;
    body: string;
    source: string;
    hasResumeFile: boolean;
    emailConfigured?: boolean;
  } | null>(null);
  const [whatsappDraft, setWhatsappDraft] = useState<{
    message: string;
    waUrl: string;
    source: string;
    hasResumeFile: boolean;
    resumeFileName: string;
  } | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingWalkIn, setMarkingWalkIn] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmailDraft(null);
      setWhatsappDraft(null);
      return;
    }
    fetch("/api/student/placement/smtp", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmailConfigured(!!d.emailConfigured))
      .catch(() => setEmailConfigured(false));
  }, [open, job?.id]);

  useEffect(() => {
    if (!open || !job || job.appliedAt || job.applyType !== "WHATSAPP") return;
    void prepareWhatsAppApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate when job changes
  }, [open, job?.id, job?.applyType, job?.appliedAt]);

  if (!open || !job) return null;

  const activeJob = job;

  async function recordApply(channel: ApplicationChannel) {
    const res = await fetch("/api/student/placement/record-application", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: activeJob.id, channel }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save application");
      return null;
    }
    const appliedAt = data.appliedAt as string;
    onApplied?.(activeJob.id, appliedAt);
    return appliedAt;
  }

  async function prepareEmailApply() {
    setLoading(true);
    setEmailDraft(null);
    try {
      const res = await fetch("/api/student/placement/generate-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeJob.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not prepare application email");
        return;
      }
      setEmailDraft(data);
      if (!data.hasResumeSummary) {
        toast.message("Add or regenerate resume summary in Placement profile for stronger AI emails.");
      } else if (data.source === "template") {
        toast.message("Using basic template — check PLACEMENT_OPENAI_API_KEY (or OPENAI_API_KEY) on Vercel.");
      } else {
        toast.success("AI application email ready");
      }
    } finally {
      setLoading(false);
    }
  }

  async function prepareWhatsAppApply() {
    setLoading(true);
    setWhatsappDraft(null);
    try {
      const res = await fetch("/api/student/placement/generate-whatsapp-apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeJob.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not prepare WhatsApp message");
        return;
      }
      setWhatsappDraft(data);
      if (!data.hasResumeSummary) {
        toast.message("Add resume summary in Placement profile for stronger AI WhatsApp messages.");
      } else if (data.source === "template") {
        toast.message("Using basic template — check PLACEMENT_OPENAI_API_KEY (or OPENAI_API_KEY) on Vercel.");
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
      return null;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
    toast.success("Download your resume PDF and attach it in the email app.");
    return data as { url: string; fileName: string };
  }

  async function openMailApp() {
    if (!emailDraft) return;
    if (emailDraft.hasResumeFile) {
      await downloadResume();
    }
    const appliedAt = await recordApply("EMAIL_MAILTO");
    if (!appliedAt) return;
    window.location.href = buildMailtoUrl(emailDraft.to, emailDraft.subject, emailDraft.body);
    toast.message("Email opened — attach the resume PDF you downloaded, then send.");
    onOpenChange(false);
  }

  async function sendViaGmail() {
    setSending(true);
    try {
      const res = await fetch("/api/student/placement/send-application", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeJob.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Send failed");
        return;
      }
      if (data.appliedAt) {
        onApplied?.(activeJob.id, data.appliedAt);
      }
      toast.success("Application email sent with your resume attached.");
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  async function openExternalLink() {
    const url = activeJob.applyUrl;
    if (!url) return;
    const appliedAt = await recordApply("EXTERNAL_LINK");
    if (!appliedAt) return;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Application recorded.");
    onOpenChange(false);
  }

  async function markWalkInApplied() {
    setMarkingWalkIn(true);
    try {
      const appliedAt = await recordApply("WALK_IN");
      if (!appliedAt) return;
      toast.success("Walk-in application recorded.");
      onOpenChange(false);
    } finally {
      setMarkingWalkIn(false);
    }
  }

  async function startCall() {
    const phone = activeJob.applyPhone?.trim();
    if (!phone) {
      toast.error("No phone number on this job");
      return;
    }
    setCalling(true);
    try {
      const appliedAt = await recordApply("CALL");
      if (!appliedAt) return;
      window.location.href = buildTelUrl(phone);
      toast.message("Opening phone dialer — mention the role when you speak with HR.");
      onOpenChange(false);
    } finally {
      setCalling(false);
    }
  }

  async function openWhatsAppWithResume() {
    if (!whatsappDraft) return;
    if (!whatsappDraft.hasResumeFile) {
      toast.error("Upload your resume under Profile → Placement first");
      return;
    }

    setOpeningWhatsApp(true);
    try {
      const appliedAt = await recordApply("WHATSAPP");
      if (!appliedAt) return;

      const resumeRes = await fetch("/api/student/placement/resume/download", { credentials: "include" });
      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) {
        toast.error(resumeData.error ?? "Could not load resume");
        return;
      }

      const outcome = await shareApplicationViaWhatsApp(whatsappDraft.waUrl, whatsappDraft.message, {
        url: resumeData.url,
        fileName: resumeData.fileName ?? whatsappDraft.resumeFileName,
      });

      if (outcome === "shared_with_file") {
        toast.success("Share sheet opened — pick WhatsApp to send with your resume attached.");
      } else if (outcome === "opened_wa_downloaded_resume") {
        toast.message("WhatsApp opened — attach the resume PDF that was downloaded, then send.");
      } else {
        toast.message("WhatsApp opened — upload resume from Profile if needed.");
      }
      onOpenChange(false);
    } finally {
      setOpeningWhatsApp(false);
    }
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
            <h2 className="text-lg font-bold text-slate-900">Apply — {activeJob.title}</h2>
            <p className="text-sm text-slate-500">{activeJob.company}</p>
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

        {activeJob.appliedAt ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Already applied</p>
            <p className="mt-1 text-emerald-800">Applied on {formatAppliedAt(activeJob.appliedAt)}</p>
          </div>
        ) : null}

        {!activeJob.appliedAt && activeJob.applyType === "LINK" && activeJob.applyUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">You will be redirected to the official application page.</p>
            <Button type="button" className="w-full" onClick={() => void openExternalLink()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open apply link
            </Button>
          </div>
        ) : null}

        {!activeJob.appliedAt && activeJob.applyType === "WALK_IN" ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Walk-in details
              </p>
              <p className="mt-2 whitespace-pre-wrap">{activeJob.walkInDetails}</p>
            </div>
            <Button type="button" className="w-full" disabled={markingWalkIn} onClick={() => void markWalkInApplied()}>
              {markingWalkIn ? "Saving…" : "Mark as applied (walk-in)"}
            </Button>
          </div>
        ) : null}

        {!activeJob.appliedAt && activeJob.applyType === "CALL" ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <Phone className="h-4 w-4 text-indigo-600" />
                Call to apply
              </p>
              <p className="mt-2 font-medium text-slate-900">{activeJob.applyPhone ?? "—"}</p>
              <p className="mt-2 text-slate-600">
                Tap below to open your phone dialer. Introduce yourself and mention this role.
              </p>
            </div>
            <Button type="button" className="w-full" disabled={calling || !activeJob.applyPhone} onClick={() => void startCall()}>
              <Phone className="mr-2 h-4 w-4" />
              {calling ? "Opening…" : "Call now"}
            </Button>
          </div>
        ) : null}

        {!activeJob.appliedAt && activeJob.applyType === "WHATSAPP" ? (
          <div className="space-y-4">
            {loading && !whatsappDraft ? (
              <p className="text-center text-sm text-slate-500">Generating WhatsApp message with AI…</p>
            ) : null}
            {whatsappDraft ? (
              <>
                <p className="text-xs text-slate-500">
                  Message is tailored to the job description using your resume summary as reference (not pasted). Your
                  profile resume PDF is attached when your device supports share-with-file.
                </p>
                <div className="rounded-lg border bg-white p-3 text-sm">
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                    {whatsappDraft.message}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    disabled={openingWhatsApp || !whatsappDraft.hasResumeFile}
                    onClick={() => void openWhatsAppWithResume()}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {openingWhatsApp ? "Opening WhatsApp…" : "Send on WhatsApp (with resume)"}
                  </Button>
                  {!whatsappDraft.hasResumeFile ? (
                    <p className="text-xs text-amber-800">
                      Upload a resume under{" "}
                      <Link href="/profile/placement" className="font-medium text-indigo-700 underline">
                        Profile → Placement
                      </Link>{" "}
                      before applying.
                    </p>
                  ) : null}
                  <Button type="button" variant="outline" disabled={loading} onClick={() => void prepareWhatsAppApply()}>
                    Regenerate message
                  </Button>
                </div>
              </>
            ) : !loading ? (
              <Button className="w-full" onClick={() => void prepareWhatsAppApply()}>
                Generate WhatsApp message
              </Button>
            ) : null}
          </div>
        ) : null}

        {!activeJob.appliedAt && activeJob.applyType === "EMAIL" ? (
          <div className="space-y-4">
            {!emailDraft ? (
              <Button className="w-full" disabled={loading} onClick={() => void prepareEmailApply()}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Generating email…" : "Generate application email"}
              </Button>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  <strong>Send from my Gmail</strong> attaches your resume automatically.{" "}
                  <strong>Open email app</strong> fills the message — download the PDF and attach it yourself.
                </p>
                <div className="rounded-lg border bg-white p-3 text-sm">
                  <p className="font-medium text-slate-900">To: {emailDraft.to}</p>
                  <p className="mt-2 font-medium">Subject: {emailDraft.subject}</p>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                    {emailDraft.body}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  {emailConfigured || emailDraft.emailConfigured ? (
                    <Button type="button" disabled={sending} onClick={() => void sendViaGmail()}>
                      {sending ? "Sending…" : "Send from my Gmail (resume attached)"}
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      For one-tap send with resume attached, set up Gmail on your{" "}
                      <Link href="/dashboard/placement/email-setup" className="font-medium text-indigo-700 underline">
                        Placement email setup
                      </Link>{" "}
                      (includes link to create Google App Password).
                    </p>
                  )}
                  {emailDraft.hasResumeFile ? (
                    <Button type="button" variant="secondary" onClick={() => void downloadResume()}>
                      Download resume PDF
                    </Button>
                  ) : (
                    <p className="text-xs text-amber-800">
                      Upload a resume under Profile → Placement before sending.
                    </p>
                  )}
                  <Button type="button" variant="outline" onClick={() => void openMailApp()}>
                    Open email app (attach PDF manually)
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
