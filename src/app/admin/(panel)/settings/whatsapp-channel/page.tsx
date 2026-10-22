"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoading } from "@/components/brand/brand-loading";
import { formatApiError } from "@/lib/api/format-api-error";
import { toast } from "sonner";

type Settings = {
  enabled: boolean;
  provider: string;
  apiBaseUrl: string;
  sessionId: string;
  channelId: string;
  hasApiKey: boolean;
};

type RecentPost = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: string;
  errorMessage: string | null;
  postedAt: string | null;
};

export default function WhatsAppChannelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.walayer.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/settings/whatsapp-channel", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(formatApiError(data.error));
      setLoading(false);
      return;
    }
    setSettings(data.settings);
    setRecentPosts(data.recentPosts ?? []);
    setNote(data.note ?? "");
    setEnabled(!!data.settings?.enabled);
    setSessionId(data.settings?.sessionId ?? "");
    setChannelId(data.settings?.channelId ?? "");
    setApiBaseUrl(data.settings?.apiBaseUrl ?? "https://api.walayer.com/v1");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/whatsapp-channel", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          sessionId,
          channelId,
          apiBaseUrl,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(formatApiError(data.error));
        return;
      }
      setApiKey("");
      toast.success("WhatsApp Channel settings saved");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/whatsapp-channel/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          apiBaseUrl,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? formatApiError(data.error));
        return;
      }
      toast.success(data.message ?? "Connection OK");
    } finally {
      setTesting(false);
    }
  }

  async function retryPost(jobId: string) {
    setRetryingId(jobId);
    try {
      const res = await fetch(`/api/admin/placement/jobs/${jobId}/whatsapp-channel/retry`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? data.reason ?? "Retry failed");
        load();
        return;
      }
      toast.success(data.alreadyPosted ? "Already posted to channel" : "Posted to WhatsApp Channel");
      load();
    } finally {
      setRetryingId(null);
    }
  }

  if (loading) return <BrandLoading fullPage message="Loading WhatsApp integration…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Channel integration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Auto-post newly <strong>published</strong> placement jobs to your WhatsApp Channel. Edits to already-live jobs
          are not re-posted. Each job is posted at most once unless you retry a failed post.
        </p>
        {note ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{note}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WALayer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-slate-300"
              />
              Enable automatic channel posting
            </label>
            <div>
              <Label htmlFor="wa-api-base">API base URL</Label>
              <Input
                id="wa-api-base"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.walayer.com/v1"
              />
            </div>
            <div>
              <Label htmlFor="wa-session-id">Session ID</Label>
              <Input
                id="wa-session-id"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="sess_01j…"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                The linked WhatsApp number session from your WALayer dashboard (Sessions → copy id).
              </p>
            </div>
            <div>
              <Label htmlFor="wa-channel-id">Channel ID (newsletter JID)</Label>
              <Input
                id="wa-channel-id"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="120363428122592568@newsletter"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Newsletter JID ending in <code>@newsletter</code> (listed under Channels for your session).{" "}
                <a
                  href="https://walayer.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  WALayer API docs
                </a>
              </p>
            </div>
            <div>
              <Label htmlFor="wa-api-key">API key</Label>
              <Input
                id="wa-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasApiKey ? "Saved — enter only to replace" : "wsk_live_…"}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
              <Button type="button" variant="outline" disabled={testing} onClick={() => void testConnection()}>
                {testing ? "Testing…" : "Test connection"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent channel posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!recentPosts.length ? (
            <p className="text-sm text-slate-500">No channel post attempts yet.</p>
          ) : (
            recentPosts.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {p.jobTitle} · {p.company}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status:{" "}
                    <span
                      className={
                        p.status === "SUCCESS"
                          ? "text-emerald-700"
                          : p.status === "FAILED"
                            ? "text-rose-700"
                            : "text-amber-700"
                      }
                    >
                      {p.status}
                    </span>
                    {p.postedAt ? ` · ${new Date(p.postedAt).toLocaleString()}` : ""}
                  </p>
                  {p.errorMessage ? <p className="mt-1 text-xs text-rose-700">{p.errorMessage}</p> : null}
                </div>
                {p.status === "FAILED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryingId === p.jobId}
                    onClick={() => void retryPost(p.jobId)}
                  >
                    {retryingId === p.jobId ? "Retrying…" : "Retry"}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
