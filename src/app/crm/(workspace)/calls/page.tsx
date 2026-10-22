"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type CallRow = {
  id: string;
  direction: string;
  status: string;
  callerJid: string | null;
  startedAt: string;
  providerCallId: string | null;
};

export default function CrmCallsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [limitations, setLimitations] = useState("");

  async function load() {
    const res = await fetch("/api/crm/calls", { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setCalls(data.calls ?? []);
      setLimitations(data.limitations ?? "");
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, []);

  async function reject(id: string) {
    const res = await fetch(`/api/crm/calls/${id}/reject`, { method: "POST", credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Reject failed");
      return;
    }
    toast.success("Call rejected via API");
    void load();
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-white">Calls</h1>
      {limitations ? (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {limitations}
        </p>
      ) : null}
      {calls.map((c) => (
        <Card key={c.id} className="border-slate-800 bg-slate-900">
          <CardContent className="flex items-center justify-between py-4 text-sm">
            <div className="text-slate-300">
              <p>{c.direction} · {c.status}</p>
              <p className="text-xs text-slate-500">{c.callerJid} · {new Date(c.startedAt).toLocaleString()}</p>
            </div>
            {c.status === "RINGING" && c.direction === "INBOUND" ? (
              <Button size="sm" variant="destructive" onClick={() => void reject(c.id)}>
                Reject
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {!calls.length ? <p className="text-slate-500">No call activity yet.</p> : null}
    </div>
  );
}
