"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLoading } from "@/components/brand/brand-loading";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function ProfilePlacementPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    resumeFileName: "",
    resumeText: "",
    emailHeader: "",
    emailFooter: "",
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    const [st, pr, jobsPayload] = await Promise.all([
      fetch("/api/student/placement/status", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/student/placement/profile", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/placement/jobs", { credentials: "include" }).then((r) => r.json()),
    ]);
    setStatus(st);
    setPlans(jobsPayload.plans ?? []);
    if (pr.profile) {
      setProfile({
        resumeFileName: pr.profile.resumeFileName ?? "",
        resumeText: pr.profile.resumeText ?? "",
        emailHeader: pr.profile.emailHeader ?? "",
        emailFooter: pr.profile.emailFooter ?? "",
      });
    }
    setLoading(false);
  }

  async function subscribe(planId: string) {
    setSubscribing(planId);
    try {
      const res = await fetch("/api/placement/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed");
        return;
      }
      if (data.free) {
        toast.success("Subscription activated!");
        void load();
        return;
      }
      window.location.href = `/placement/subscribe/pay?session=${encodeURIComponent(
        data.paymentSessionId
      )}&order=${encodeURIComponent(data.planOrderId)}`;
    } finally {
      setSubscribing(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProfile() {
    const res = await fetch("/api/student/placement/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText: profile.resumeText,
        emailHeader: profile.emailHeader,
        emailFooter: profile.emailFooter,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Save failed");
    toast.success("Placement profile saved");
  }

  async function onResumeFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Resume must be a PDF");
      return;
    }
    setUploading(true);
    try {
      const presign = await fetch("/api/student/placement/resume/presign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const ps = await presign.json();
      if (!presign.ok) throw new Error(ps.error ?? "Upload failed");

      const put = await fetch(ps.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Storage upload failed");

      const patch = await fetch("/api/student/placement/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeStorageKey: ps.key,
          resumeFileName: file.name,
        }),
      });
      const data = await patch.json();
      if (!patch.ok) throw new Error(data.error ?? "Save failed");

      setProfile((p) => ({ ...p, resumeFileName: file.name }));
      toast.success("Resume uploaded — generating AI summary…");
      setAnalyzing(true);
      try {
        const analyzeRes = await fetch("/api/student/placement/resume/analyze", {
          method: "POST",
          credentials: "include",
        });
        const analyzeData = await analyzeRes.json();
        if (analyzeRes.ok && analyzeData.resumeText) {
          setProfile((p) => ({ ...p, resumeText: analyzeData.resumeText }));
          toast.success(
            analyzeData.summarySource === "ai"
              ? "AI resume summary ready — used for job emails"
              : "Resume text saved — add OpenAI key on Vercel for smarter summaries"
          );
        } else {
          toast.error(
            typeof analyzeData.error === "string"
              ? analyzeData.error
              : "Summary not generated — paste highlights below"
          );
        }
      } finally {
        setAnalyzing(false);
      }
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <StudentShell>
        <BrandLoading fullPage message="Loading placement profile…" />
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Placement profile</h1>
            <p className="text-sm text-slate-500">Resume & email templates for job applications</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/placement">View jobs</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {status?.subscribed ? (
              <p className="text-emerald-700">
                Active — {status.subscription?.planName}
                {status.subscription?.endsAt
                  ? ` (until ${new Date(status.subscription.endsAt).toLocaleDateString()})`
                  : " (lifetime)"}
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-amber-800">Choose a plan to unlock job apply:</p>
                <ul className="space-y-2">
                  {plans.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.priceLabel ?? formatCurrency(p.priceAmount ?? 0)}
                          {p.durationDays ? ` · ${p.durationDays} days` : " · Lifetime"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={subscribing === p.id}
                        onClick={() => void subscribe(p.id)}
                      >
                        {subscribing === p.id ? "Please wait…" : p.priceAmount > 0 ? "Pay & subscribe" : "Activate free"}
                      </Button>
                    </li>
                  ))}
                </ul>
                {!plans.length ? (
                  <p className="text-sm text-slate-500">No plans available yet. Contact admin.</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume (PDF)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.resumeFileName ? (
              <p className="text-sm text-slate-600">Current file: {profile.resumeFileName}</p>
            ) : null}
            <div>
              <Label>Upload resume</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={uploading || analyzing}
                onChange={(e) => void onResumeFile(e.target.files?.[0] ?? null)}
              />
              {analyzing ? (
                <p className="mt-2 text-sm text-indigo-600">Analyzing resume with AI…</p>
              ) : null}
            </div>
            <div>
              <Label>Resume summary for AI</Label>
              <p className="mb-2 text-xs text-slate-500">
                Auto-filled after PDF upload. Edit if needed — job application emails use this text.
              </p>
              <Textarea
                rows={8}
                value={profile.resumeText}
                onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
                placeholder="Upload a PDF to auto-generate, or paste skills and experience here…"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={!profile.resumeFileName || analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  try {
                    const res = await fetch("/api/student/placement/resume/analyze", {
                      method: "POST",
                      credentials: "include",
                    });
                    const data = await res.json();
                    if (res.ok && data.resumeText) {
                      setProfile((p) => ({ ...p, resumeText: data.resumeText }));
                      toast.success("Summary regenerated");
                    } else {
                      toast.error(data.error ?? "Could not regenerate summary");
                    }
                  } finally {
                    setAnalyzing(false);
                  }
                }}
              >
                Regenerate summary from PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              Write your own header and footer. The middle of the email is generated from your resume and the job
              description.
            </p>
            <div>
              <Label>Header</Label>
              <Textarea
                rows={3}
                value={profile.emailHeader}
                onChange={(e) => setProfile({ ...profile, emailHeader: e.target.value })}
              />
            </div>
            <div>
              <Label>Footer</Label>
              <Textarea
                rows={3}
                value={profile.emailFooter}
                onChange={(e) => setProfile({ ...profile, emailFooter: e.target.value })}
              />
            </div>
            <Button onClick={() => void saveProfile()}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
