"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoading } from "@/components/brand/brand-loading";
import { consumeCrmPairStream } from "@/lib/walayer/pair-qr-client";
import { toast } from "sonner";

type Account = {
  id: string;
  label: string;
  status: string;
  statusMessage: string | null;
  phoneE164: string | null;
  hasSession: boolean;
};

type QrState = {
  status: "idle" | "loading" | "qr" | "connected" | "waiting" | "error";
  qrImage: string | null;
  message: string;
};

export default function CrmConnectionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [label, setLabel] = useState("");
  const [country, setCountry] = useState("IN");
  const [pairingId, setPairingId] = useState<string | null>(null);
  const [streamGeneration, setStreamGeneration] = useState(0);
  const [qr, setQr] = useState<QrState>({
    status: "idle",
    qrImage: null,
    message: "",
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  async function load() {
    const res = await fetch("/api/crm/connections", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setAccounts(data.accounts ?? []);
  }

  const checkConnectionStatus = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/crm/connections/${accountId}/pair/qr`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return;
      if (data.status === "connected") {
        setQr({
          status: "connected",
          qrImage: null,
          message: data.message ?? "WhatsApp is linked.",
        });
        toast.success("WhatsApp connected");
        streamAbortRef.current?.abort();
        void load();
      }
    } catch {
      /* ignore background status errors */
    }
  }, []);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;

    if (!pairingId) {
      setQr({ status: "idle", qrImage: null, message: "" });
      return;
    }

    setQr({
      status: "loading",
      qrImage: null,
      message: "Starting QR stream from WALayer…",
    });

    const ac = new AbortController();
    streamAbortRef.current = ac;

    void consumeCrmPairStream(pairingId, ac.signal, {
      onQr: (dataUrl) => {
        setQr({
          status: "qr",
          qrImage: dataUrl,
          message: "Scan with WhatsApp → Linked devices → Link a device.",
        });
      },
      onConnected: () => {
        setQr({
          status: "connected",
          qrImage: null,
          message: "WhatsApp is linked for this number.",
        });
        toast.success("WhatsApp connected");
        void load();
      },
      onError: (message) => {
        setQr((prev) => ({
          status: "error",
          qrImage: prev.qrImage,
          message,
        }));
      },
    }).finally(() => {
      if (!ac.signal.aborted) {
        setQr((prev) =>
          prev.qrImage
            ? prev
            : {
                status: "waiting",
                qrImage: null,
                message: "Stream ended. Tap Refresh QR to try again.",
              }
        );
      }
    });

    pollRef.current = setInterval(() => {
      void checkConnectionStatus(pairingId);
    }, 4000);

    return () => {
      ac.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pairingId, streamGeneration, checkConnectionStatus]);

  async function createConnection() {
    const res = await fetch("/api/crm/connections", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim() || "Support line",
        country: country.toUpperCase(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create connection");
      return;
    }
    setLabel("");
    setStreamGeneration((n) => n + 1);
    setPairingId(data.account.id);
    toast.success("Session created — loading QR…");
    void load();
  }

  function startReconnect(accountId: string) {
    setStreamGeneration((n) => n + 1);
    setPairingId(accountId);
  }

  function refreshQrStream() {
    setStreamGeneration((n) => n + 1);
    setQr((prev) => ({
      ...prev,
      status: "loading",
      message: "Refreshing QR…",
    }));
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
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-slate-500">Label</label>
            <Input
              placeholder="e.g. Support"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 max-w-xs border-slate-700 bg-slate-950"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Country (WALayer)</label>
            <select
              className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="IN">India (IN)</option>
              <option value="US">United States (US)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="AE">UAE (AE)</option>
            </select>
          </div>
          <Button onClick={() => void createConnection()}>Create & show QR</Button>
        </CardContent>
      </Card>

      {pairingId ? (
        <Card className="border-emerald-900/50 bg-slate-900">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center text-sm text-slate-300">
            {qr.status === "loading" && !qr.qrImage ? (
              <BrandLoading message="Loading QR code…" />
            ) : null}
            {qr.qrImage ? (
              <div className="rounded-xl bg-white p-4 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrImage} alt="WhatsApp QR code" className="h-64 w-64 object-contain" />
              </div>
            ) : null}
            {qr.status === "connected" ? (
              <p className="text-lg font-medium text-emerald-400">Connected successfully</p>
            ) : null}
            {qr.status === "waiting" && !qr.qrImage ? (
              <p className="text-amber-200">QR is generating… keep this open or tap Refresh QR.</p>
            ) : null}
            {qr.status === "error" && !qr.qrImage ? (
              <p className="text-red-300">{qr.message}</p>
            ) : null}
            {qr.message && qr.status !== "error" ? (
              <p className="max-w-md text-slate-400">{qr.message}</p>
            ) : null}
            {qr.status === "error" && qr.qrImage ? (
              <p className="max-w-md text-amber-400">{qr.message}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={refreshQrStream}>
                Refresh QR
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPairingId(null)}>
                Close
              </Button>
            </div>
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
              <Button variant="outline" size="sm" onClick={() => startReconnect(a.id)}>
                {a.status === "CONNECTED" ? "Show QR again" : "Reconnect QR"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
