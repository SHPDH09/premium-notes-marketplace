"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Preset = "today" | "yesterday" | "last7" | "last30" | "this_month" | "prev_month";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "this_month", label: "This month" },
  { id: "prev_month", label: "Previous month" },
];

export function ReportsWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [preset, setPreset] = useState<Preset>("last7");
  const [tab, setTab] = useState<
    "overview" | "agents" | "teams" | "whatsapp" | "campaigns" | "calls" | "my"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const section = tab === "my" ? "agent-self" : tab;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ preset, section });
    const res = await fetch(`/api/crm/reports?${params}`, { credentials: "include" });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setGeneratedAt(json.generatedAt ?? null);
      setRangeLabel(json.range?.label ?? "");
    }
    setLoading(false);
  }, [preset, section]);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = data?.overview as {
    conversations?: Record<string, number>;
    messages?: Record<string, number> & { delivery?: { failed?: number; note?: string } };
    customers?: Record<string, number>;
  };
  const charts = data?.charts as {
    conversationTrend?: { date: string; conversations: number }[];
    messageTrend?: { date: string; inbound: number; outbound: number }[];
  };

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      { label: "New conversations", value: overview.conversations?.newInRange },
      { label: "Open now", value: overview.conversations?.open },
      { label: "Unassigned", value: overview.conversations?.unassigned },
      { label: "Inbound messages", value: overview.messages?.inbound },
      { label: "Outbound messages", value: overview.messages?.outbound },
      { label: "Manual replies", value: overview.messages?.manualOutbound },
      { label: "Failed delivery", value: overview.messages?.delivery?.failed },
      { label: "Customers active", value: overview.customers?.contactedInRange },
    ];
  }, [overview]);

  function exportCsv(type: string) {
    window.location.href = `/api/crm/reports/export?type=${type}&preset=${preset}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & analytics</h1>
          <p className="text-sm text-slate-400">
            {rangeLabel}
            {generatedAt ? ` · Updated ${new Date(generatedAt).toLocaleString()}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
          {isAdmin ? (
            <Button size="sm" variant="outline" onClick={() => exportCsv(tab === "agents" ? "agents" : "overview")}>
              Export CSV
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {(
          [
            ["overview", "Overview"],
            ...(isAdmin
              ? ([
                  ["agents", "Agents"],
                  ["teams", "Teams"],
                  ["whatsapp", "WhatsApp numbers"],
                  ["campaigns", "Campaigns"],
                  ["calls", "Calls"],
                ] as const)
              : ([["my", "My performance"]] as const)),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === id ? "bg-emerald-600/25 text-emerald-300" : "text-slate-400 hover:bg-slate-800"
            }`}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Loading reports…</p>
      ) : null}

      {tab === "overview" && overview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label} className="border-slate-800 bg-slate-900">
                <CardContent className="py-4">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-semibold text-white">{s.value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {(overview.messages as { delivery?: { note?: string } })?.delivery?.note ? (
            <p className="text-xs text-amber-400/90">
              {(overview.messages as { delivery: { note: string } }).delivery.note}
            </p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-sm text-slate-300">New conversations</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.conversationTrend ?? []}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                    <Line type="monotone" dataKey="conversations" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-sm text-slate-300">Messages in vs out</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.messageTrend ?? []}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                    <Legend />
                    <Bar dataKey="inbound" fill="#60a5fa" name="Inbound" />
                    <Bar dataKey="outbound" fill="#34d399" name="Outbound" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {tab === "agents" && isAdmin ? (
        <ReportTable
          headers={["Agent", "Team", "Assigned", "Resolved", "Pending", "Manual replies"]}
          rows={((data?.agents as Record<string, unknown>[]) ?? []).map((a) => [
            String(a.name),
            String(a.team ?? "—"),
            String(a.assignedConversations),
            String(a.resolvedConversations),
            String(a.pendingConversations),
            String(a.manualReplies),
          ])}
        />
      ) : null}

      {tab === "teams" && isAdmin ? (
        <ReportTable
          headers={["Team", "Agents", "Conversations", "Resolved", "Pending"]}
          rows={((data?.teams as Record<string, unknown>[]) ?? []).map((t) => [
            String(t.teamName),
            String(t.agents),
            String(t.conversations),
            String(t.resolved),
            String(t.pending),
          ])}
        />
      ) : null}

      {tab === "whatsapp" && isAdmin ? (
        <ReportTable
          headers={["Label", "Phone", "Status", "Inbound", "Outbound", "Active chats", "Failed out"]}
          rows={((data?.numbers as Record<string, unknown>[]) ?? []).map((n) => [
            String(n.label),
            String(n.phoneE164 ?? "—"),
            String(n.status),
            String(n.inbound),
            String(n.outbound),
            String(n.activeConversations),
            String(n.failedOutbound),
          ])}
        />
      ) : null}

      {tab === "campaigns" && isAdmin ? (
        <ReportTable
          headers={["Campaign", "Status", "Recipients", "Sent", "Failed", "Note"]}
          rows={((data?.campaigns as Record<string, unknown>[]) ?? []).map((c) => [
            String(c.name),
            String(c.status),
            String(c.recipientCount),
            c.sent != null ? String(c.sent) : "—",
            c.failed != null ? String(c.failed) : "—",
            String(c.note ?? ""),
          ])}
        />
      ) : null}

      {tab === "calls" && isAdmin ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="space-y-2 py-6 text-sm text-slate-300">
            <p>{String((data?.calls as { note?: string })?.note ?? "")}</p>
            <p>Total: {(data?.calls as { total?: number })?.total ?? 0}</p>
            <p>Missed: {(data?.calls as { missed?: number })?.missed ?? 0}</p>
            <p>Rejected: {(data?.calls as { rejected?: number })?.rejected ?? 0}</p>
            <p>Answered: {(data?.calls as { answered?: number })?.answered ?? 0}</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "my" && !isAdmin ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="space-y-2 py-6 text-sm text-slate-300">
            {data?.agent ? (
              <>
                <p>Assigned conversations: {(data.agent as { assignedConversations: number }).assignedConversations}</p>
                <p>Resolved: {(data.agent as { resolvedConversations: number }).resolvedConversations}</p>
                <p>Pending: {(data.agent as { pendingConversations: number }).pendingConversations}</p>
                <p>Manual replies: {(data.agent as { manualReplies: number }).manualReplies}</p>
              </>
            ) : (
              <p>No agent metrics for this period.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">No data for this period.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-800 bg-slate-950/40">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
