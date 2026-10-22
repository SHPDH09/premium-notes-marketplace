"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Account = {
  id: string;
  label: string;
  status: string;
  statusMessage: string | null;
  phoneE164: string | null;
  hasSession: boolean;
};

export default function CrmConnectionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [label, setLabel] = useState("");
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [qrHint, setQrHint] = useState<string>("");

  async function load() {
    const res = await fetch("/api/crm/connections", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setAccounts(data.accounts ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!pairingId) return;
    setQrHint("Open WhatsApp on your phone → Linked devices → Link a device. QR updates below.");
    const es = new EventSource(`/api/crm/connections/${pairingId}/pair/stream`);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { type?: string; qr?: string };
        if (payload.qr) setQrHint("Scan the QR shown in WALayer stream (base64 frame received).");
      } catch {
        /* SSE may send non-JSON keepalives */
      }
    };
    es.onerror = () => {
      setQrHint("QR stream ended or unavailable — refresh status after scanning.");
      es.close();
    };
    return () => es.close();
  }, [pairingId]);

  async function createConnection() {
    const res = await fetch("/api/crm/connections", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || "Support line" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create connection");
      return;
    }
    setLabel("");
    setPairingId(data.account.id);
    toast.success("Session created — scan QR to connect");
    void load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">WhatsApp connections</h1>
        <p className="text-sm text-slate-400">
          Link numbers via WALayer QR pairing. API keys stay on the server; agents never see credentials.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-emerald-400">Add number</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Label (e.g. Sales)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="max-w-xs border-slate-700 bg-slate-950"
          />
          <Button onClick={() => void createConnection()}>Create & show QR</Button>
        </CardContent>
      </Card>

      {pairingId ? (
        <Card className="border-emerald-900/50 bg-slate-900">
          <CardContent className="pt-6 text-sm text-slate-300">
            <p>{qrHint}</p>
            <p className="mt-2 text-xs text-slate-500">Connection id: {pairingId}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {accounts.map((a) => (
          <Card key={a.id} className="border-slate-800 bg-slate-900">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="font-medium text-white">{a.label}</p>
                <p className="text-xs text-slate-400">
                  {a.status} {a.phoneE164 ? `· ${a.phoneE164}` : ""}
                </p>
                {a.statusMessage ? <p className="text-xs text-amber-400">{a.statusMessage}</p> : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPairingId(a.id);
                }}
              >
                Reconnect QR
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
