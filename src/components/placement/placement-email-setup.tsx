"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  GMAIL_APP_PASSWORDS_URL,
  GMAIL_SECURITY_URL,
  GMAIL_APP_PASSWORD_STEPS,
} from "@/lib/placement/gmail-app-password";

export function PlacementEmailSetup() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [smtpEmail, setSmtpEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/placement/smtp", { credentials: "include" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLoadError(d.error ?? "Could not load email setup. If you just deployed, wait for database migration.");
          return;
        }
        setConfigured(!!d.emailConfigured);
        setSmtpEmail(d.smtpEmail ?? "");
      })
      .catch(() => setLoadError("Network error loading email setup."))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/student/placement/smtp", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpEmail, appPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Setup failed");
        return;
      }
      setConfigured(true);
      setAppPassword("");
      toast.success("Email setup complete — you can send applications with resume attached.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Placement email setup
          {configured ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-amber-800">{loadError}</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">How it works</p>
              <p className="mt-2">
                Use your <strong>Gmail</strong> and a Google <strong>App password</strong> (not your normal login
                password). When you apply to a job, we send the application email from your inbox with your resume
                PDF attached.
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900">Create a Gmail App password</p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
                {GMAIL_APP_PASSWORD_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="default" size="sm" asChild>
                  <a href={GMAIL_APP_PASSWORDS_URL} target="_blank" rel="noopener noreferrer">
                    Create App Password
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={GMAIL_SECURITY_URL} target="_blank" rel="noopener noreferrer">
                    Google Security (2-Step Verification)
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                App passwords page:{" "}
                <a
                  href={GMAIL_APP_PASSWORDS_URL}
                  className="text-indigo-600 underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {GMAIL_APP_PASSWORDS_URL}
                </a>
              </p>
            </div>

            <form onSubmit={save} className="space-y-4 max-w-md border-t pt-6">
              <p className="text-sm font-semibold text-slate-900">Save on your dashboard</p>
              <div>
                <Label htmlFor="smtp-email">Gmail address</Label>
                <Input
                  id="smtp-email"
                  type="email"
                  required
                  placeholder="you@gmail.com"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="app-password">App password</Label>
                <Input
                  id="app-password"
                  type="password"
                  required={!configured}
                  maxLength={100}
                  placeholder={configured ? "Enter again to update" : "Paste 16-character app password"}
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : configured ? "Update email setup" : "Save email setup"}
              </Button>
              <p className="text-xs text-slate-500">
                Prefer applying without setup? On any job use <strong>Open email app</strong> after generating the
                message — or set this up once for one-tap send with resume attached.{" "}
                <Link href="/profile/placement" className="text-indigo-600 hover:underline">
                  Placement profile
                </Link>
              </p>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
