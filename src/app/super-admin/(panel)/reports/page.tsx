"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Preset = "last7" | "last30" | "this_month";

export default function SuperAdminReportsPage() {
  const [preset, setPreset] = useState<Preset>("last7");
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);
  const [tab, setTab] = useState<"overview" | "companies">("overview");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const section = tab === "companies" ? "companies" : "overview";
    const res = await fetch(`/api/super-admin/reports?preset=${preset}&section=${section}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return;
    setGeneratedAt(data.generatedAt ?? null);
    if (section === "companies") setCompanies(data.companies ?? []);
    else setOverview(data.overview ?? null);
  }, [preset, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const flatStats = overview
    ? [
        { label: "Companies", value: (overview.companies as { total: number })?.total },
        { label: "Active companies", value: (overview.companies as { active: number })?.active },
        { label: "Agents (active)", value: (overview.agents as { active: number })?.active },
        { label: "Connected numbers", value: (overview.whatsapp as { connected: number })?.connected },
        { label: "Conversations", value: overview.conversations },
        { label: "Messages", value: (overview.messages as { total: number })?.total },
        { label: "Campaigns", value: (overview.campaigns as { total: number })?.total },
        { label: "Webhook failures", value: overview.webhookFailures },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform reports</h1>
          {generatedAt ? (
            <p className="text-xs text-slate-500">Updated {new Date(generatedAt).toLocaleString()}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {(["last7", "last30", "this_month"] as Preset[]).map((p) => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "overview" ? "default" : "outline"} onClick={() => setTab("overview")}>
          Overview
        </Button>
        <Button size="sm" variant={tab === "companies" ? "default" : "outline"} onClick={() => setTab("companies")}>
          Companies
        </Button>
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flatStats.map((s) => (
              <Card key={s.label} className="border-slate-800 bg-slate-900">
                <CardContent className="py-4">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-semibold text-emerald-400">{Number(s.value ?? 0)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {(overview?.messages as { deliveryFailed?: number }) && (
            <p className="text-xs text-slate-400">
              Failed deliveries in range: {(overview?.messages as { deliveryFailed: number }).deliveryFailed}
            </p>
          )}
          {(overview?.revenue as { note?: string })?.note ? (
            <p className="text-xs text-amber-400">{(overview?.revenue as { note: string }).note}</p>
          ) : null}
        </>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Numbers</th>
                <th className="px-3 py-2">Agents</th>
                <th className="px-3 py-2">Messages</th>
                <th className="px-3 py-2">Failed</th>
                <th className="px-3 py-2">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={String(c.id)} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-white">{String(c.name)}</td>
                  <td className="px-3 py-2 text-slate-400">{String(c.plan)}</td>
                  <td className="px-3 py-2">{String(c.status)}</td>
                  <td className="px-3 py-2">{String(c.whatsappNumbers)}</td>
                  <td className="px-3 py-2">{String(c.agents)}</td>
                  <td className="px-3 py-2">{String(c.messagesInRange)}</td>
                  <td className="px-3 py-2">{String(c.failedMessagesInRange)}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {c.lastActivityAt ? new Date(String(c.lastActivityAt)).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
