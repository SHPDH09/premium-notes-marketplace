"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SuperAdminPlatformSettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiBase, setApiBase] = useState("https://api.walayer.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  useEffect(() => {
    void fetch("/api/super-admin/platform-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.webhookUrl ?? "");
        setApiBase(d.settings?.walayerApiBaseUrl ?? apiBase);
      });
  }, [apiBase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/super-admin/platform-settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walayerApiBaseUrl: apiBase,
        ...(apiKey.trim() ? { walayerApiKey: apiKey.trim() } : {}),
        ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
      }),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    toast.success("Saved");
    setApiKey("");
    setWebhookSecret("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">WALayer platform credentials</h1>
      <p className="mt-2 text-sm text-slate-400">
        Register webhook URL in WALayer dashboard: <code className="text-emerald-400">{webhookUrl}</code>
      </p>
      <form onSubmit={save} className="mt-6 max-w-lg space-y-3">
        <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} className="bg-slate-900" placeholder="API base" />
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-slate-900" placeholder="wsk_live_… (leave blank to keep)" />
        <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="bg-slate-900" placeholder="Webhook HMAC secret" />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
