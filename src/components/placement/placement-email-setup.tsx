"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

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
          <form onSubmit={save} className="space-y-4 max-w-md">
            <p className="text-sm text-slate-600">
              Use your <strong>Gmail</strong> and a Google <strong>App password</strong> (not your normal login
              password). Applications will send from this inbox with your resume PDF attached.
            </p>
            <div>
              <Label htmlFor="smtp-email">Email ID</Label>
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
                placeholder={configured ? "Enter again to update" : "16-character app password"}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : configured ? "Update email setup" : "Save email setup"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
