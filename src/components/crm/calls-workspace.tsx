"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CallActionButton } from "@/components/crm/call-action-button";
import { toast } from "sonner";

type CallRow = {
  id: string;
  direction: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  outcome: string | null;
  internalNotes: string | null;
  providerCallId: string | null;
  hasRecording: boolean;
  callerPhone?: string | null;
  contact: { id: string; name: string | null; phone: string } | null;
  agent: { id: string; name: string } | null;
  conversationId: string | null;
};

type Stats = {
  total: number;
  incoming: number;
  outgoing: number;
  answered: number;
  missed: number;
  rejected: number;
  failed: number;
  inProgress: number;
  totalDurationSec: number;
  avgDurationSec: number | null;
};

type Capabilities = {
  summary: string;
  rejectIncoming: boolean;
  outgoingProvider: boolean;
  recordings: boolean;
};

type Member = { id: string; name: string };

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
] as const;

const OUTCOMES = [
  "INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "CALLBACK_REQUESTED",
  "NOT_INTERESTED",
  "ISSUE_RESOLVED",
  "WRONG_NUMBER",
] as const;

function formatDuration(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    RINGING: "In progress",
    ANSWERED: "Answered",
    MISSED: "Missed",
    REJECTED: "Rejected",
    FAILED: "Failed",
  };
  return map[status] ?? status;
}

export function CallsWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [agentId, setAgentId] = useState("");
  const [sort, setSort] = useState("started_desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallRow | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<
    { agentId: string; name: string; handled: number; answered: number; missed: number; totalTalkSec: number }[]
  >([]);
  const [tab, setTab] = useState<"history" | "team">("history");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("preset", preset);
    if (preset === "custom") {
      if (customFrom) p.set("from", customFrom);
      if (customTo) p.set("to", customTo);
    }
    if (q.trim()) p.set("q", q.trim());
    if (direction) p.set("direction", direction);
    if (status) p.set("status", status);
    if (agentId) p.set("agentId", agentId);
    p.set("sort", sort);
    p.set("page", String(page));
    return p.toString();
  }, [preset, customFrom, customTo, q, direction, status, agentId, sort, page]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/crm/calls?${queryString}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setStats(data.stats);
      setCalls(data.calls ?? []);
      setCapabilities(data.capabilities);
      setTotalPages(data.pagination?.totalPages ?? 1);
    }
    setLoading(false);
  }, [queryString]);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/crm/team-members", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setMembers(data.members ?? []);
  }, []);

  const loadAgentMetrics = useCallback(async () => {
    if (!isAdmin) return;
    const p = new URLSearchParams({ preset });
    if (preset === "custom") {
      if (customFrom) p.set("from", customFrom);
      if (customTo) p.set("to", customTo);
    }
    const res = await fetch(`/api/crm/calls/agents?${p}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setAgentMetrics(data.agents ?? []);
  }, [isAdmin, preset, customFrom, customTo]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 12000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    if (tab === "team") void loadAgentMetrics();
  }, [tab, loadAgentMetrics]);

  async function openDetail(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/crm/calls/${id}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not load call");
      return;
    }
    setDetail(data.call);
    setNoteDraft(data.call.internalNotes ?? "");
    setOutcomeDraft(data.call.outcome ?? "");
  }

  async function saveDetail() {
    if (!selectedId) return;
    const res = await fetch(`/api/crm/calls/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        internalNotes: noteDraft || null,
        outcome: outcomeDraft || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success("Call updated");
    setDetail(data.call);
    void loadList();
  }

  async function rejectCall(id: string) {
    const res = await fetch(`/api/crm/calls/${id}/reject`, { method: "POST", credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Reject failed");
      return;
    }
    toast.success("Call rejected");
    void loadList();
    if (selectedId === id) void openDetail(id);
  }

  const statCards = stats
    ? [
        { label: "Total calls", value: stats.total },
        { label: "Incoming", value: stats.incoming },
        { label: "Outgoing", value: stats.outgoing },
        { label: "Answered", value: stats.answered },
        { label: "Missed", value: stats.missed },
        { label: "Failed", value: stats.failed },
        { label: "In progress", value: stats.inProgress },
        { label: "Total talk time", value: formatDuration(stats.totalDurationSec) },
        { label: "Avg duration", value: formatDuration(stats.avgDurationSec) },
      ]
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calls</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {capabilities?.summary ??
              "Call metrics are computed from stored call records. WhatsApp voice capabilities depend on your connected session."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")}>
            History
          </Button>
          {isAdmin ? (
            <Button variant={tab === "team" ? "default" : "outline"} size="sm" onClick={() => setTab("team")}>
              Team performance
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={preset === p.id ? "default" : "outline"}
            onClick={() => {
              setPreset(p.id);
              setPage(1);
            }}
          >
            {p.label}
          </Button>
        ))}
        {preset === "custom" ? (
          <>
            <Input type="date" className="w-36 border-slate-700 bg-slate-900" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <Input type="date" className="w-36 border-slate-700 bg-slate-900" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        ) : null}
      </div>

      {tab === "history" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((s) => (
              <Card key={s.label} className="border-slate-800 bg-slate-900">
                <CardContent className="py-3">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-lg font-semibold text-white">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950">
              <div className="flex flex-wrap gap-2 border-b border-slate-800 p-3">
                <Input
                  placeholder="Search name, phone, notes…"
                  className="max-w-xs border-slate-700 bg-slate-900"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  value={direction}
                  onChange={(e) => {
                    setDirection(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All directions</option>
                  <option value="INBOUND">Incoming</option>
                  <option value="OUTBOUND">Outgoing</option>
                </select>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="RINGING">In progress</option>
                  <option value="ANSWERED">Answered</option>
                  <option value="MISSED">Missed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="FAILED">Failed</option>
                </select>
                {isAdmin ? (
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    value={agentId}
                    onChange={(e) => {
                      setAgentId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All agents</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="started_desc">Latest first</option>
                  <option value="started_asc">Oldest first</option>
                  <option value="duration_desc">Longest duration</option>
                </select>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {loading ? (
                  <p className="p-6 text-center text-slate-500">Loading call history…</p>
                ) : calls.length === 0 ? (
                  <p className="p-6 text-center text-slate-500">No calls in this range.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Direction</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Agent</th>
                        <th className="px-3 py-2">Started</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map((c) => (
                        <tr
                          key={c.id}
                          className={`border-t border-slate-800/80 hover:bg-slate-900/80 ${
                            selectedId === c.id ? "bg-slate-900" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <button type="button" className="text-left" onClick={() => void openDetail(c.id)}>
                              <p className="font-medium text-white">{c.contact?.name ?? "Unknown"}</p>
                              <p className="text-xs text-slate-500">{c.contact?.phone ?? "—"}</p>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {c.direction === "INBOUND" ? "Incoming" : "Outgoing"}
                          </td>
                          <td className="px-3 py-2">{statusLabel(c.status)}</td>
                          <td className="px-3 py-2 text-slate-400">{c.agent?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-slate-400">
                            {new Date(c.startedAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">{formatDuration(c.durationSec)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {c.contact ? (
                                <CallActionButton contactId={c.contact.id} conversationId={c.conversationId ?? undefined} phone={c.contact.phone} />
                              ) : null}
                              {c.status === "RINGING" && c.direction === "INBOUND" && capabilities?.rejectIncoming ? (
                                <Button size="sm" variant="destructive" onClick={() => void rejectCall(c.id)}>
                                  Reject
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-sm">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>

            <aside className="hidden min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950 p-4 lg:flex">
              {!detail ? (
                <p className="text-sm text-slate-500">Select a call to view details, notes, and outcomes.</p>
              ) : (
                <CallDetailPanel
                  detail={detail}
                  noteDraft={noteDraft}
                  outcomeDraft={outcomeDraft}
                  onNoteChange={setNoteDraft}
                  onOutcomeChange={setOutcomeDraft}
                  onSave={() => void saveDetail()}
                  onReject={() => void rejectCall(detail.id)}
                  canReject={detail.status === "RINGING" && detail.direction === "INBOUND" && !!capabilities?.rejectIncoming}
                  recordingsSupported={!!capabilities?.recordings}
                />
              )}
            </aside>
          </div>

          {detail ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 lg:hidden">
              <CallDetailPanel
                detail={detail}
                noteDraft={noteDraft}
                outcomeDraft={outcomeDraft}
                onNoteChange={setNoteDraft}
                onOutcomeChange={setOutcomeDraft}
                onSave={() => void saveDetail()}
                onReject={() => void rejectCall(detail.id)}
                canReject={detail.status === "RINGING" && detail.direction === "INBOUND" && !!capabilities?.rejectIncoming}
                recordingsSupported={!!capabilities?.recordings}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Handled</th>
                <th className="px-3 py-2">Answered</th>
                <th className="px-3 py-2">Missed</th>
                <th className="px-3 py-2">Talk time</th>
              </tr>
            </thead>
            <tbody>
              {agentMetrics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No agent call activity in this range.
                  </td>
                </tr>
              ) : (
                agentMetrics.map((a) => (
                  <tr key={a.agentId} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-white">{a.name}</td>
                    <td className="px-3 py-2">{a.handled}</td>
                    <td className="px-3 py-2">{a.answered}</td>
                    <td className="px-3 py-2">{a.missed}</td>
                    <td className="px-3 py-2">{formatDuration(a.totalTalkSec)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="border-t border-slate-800 px-3 py-2 text-xs text-slate-500">
            Metrics count distinct call records assigned to each agent. Duration alone is not a performance score.
          </p>
        </div>
      )}
    </div>
  );
}

function CallDetailPanel(props: {
  detail: CallRow;
  noteDraft: string;
  outcomeDraft: string;
  onNoteChange: (v: string) => void;
  onOutcomeChange: (v: string) => void;
  onSave: () => void;
  onReject: () => void;
  canReject: boolean;
  recordingsSupported: boolean;
}) {
  const { detail } = props;
  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-lg font-semibold text-white">Call details</h2>
      <p className="text-slate-400">
        {detail.contact?.name ?? "Unknown caller"} · {detail.contact?.phone ?? detail.callerPhone ?? "—"}
      </p>
      {!detail.contact && detail.callerPhone ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={`/crm/contacts?addPhone=${encodeURIComponent(detail.callerPhone)}`}>Create contact</Link>
        </Button>
      ) : null}
      <p>
        {detail.direction === "INBOUND" ? "Incoming" : "Outgoing"} · {statusLabel(detail.status)}
      </p>
      <p className="text-xs text-slate-500">
        Started {new Date(detail.startedAt).toLocaleString()}
        {detail.endedAt ? ` · Ended ${new Date(detail.endedAt).toLocaleString()}` : ""}
      </p>
      <p>Duration: {formatDuration(detail.durationSec)}</p>
      <p>Agent: {detail.agent?.name ?? "Unassigned"}</p>
      {detail.providerCallId ? (
        <p className="text-xs text-slate-500">Provider call ID: {detail.providerCallId}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {detail.contact ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/crm/contacts/${detail.contact.id}`}>Contact profile</Link>
          </Button>
        ) : null}
        {detail.conversationId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/crm/inbox?conversation=${detail.conversationId}`}>Open inbox</Link>
          </Button>
        ) : null}
        {detail.contact ? (
          <CallActionButton contactId={detail.contact.id} conversationId={detail.conversationId ?? undefined} />
        ) : null}
        {props.canReject ? (
          <Button size="sm" variant="destructive" onClick={props.onReject}>
            Reject incoming
          </Button>
        ) : null}
      </div>
      <div>
        <label className="text-xs text-slate-500">Outcome</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          value={props.outcomeDraft}
          onChange={(e) => props.onOutcomeChange(e.target.value)}
        >
          <option value="">—</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500">Notes</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm"
          rows={4}
          value={props.noteDraft}
          onChange={(e) => props.onNoteChange(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={props.onSave}>
        Save notes & outcome
      </Button>
      <p className="text-xs text-slate-500">
        Recording:{" "}
        {props.recordingsSupported
          ? detail.hasRecording
            ? "Available (playback not configured)"
            : "None on file"
          : "Not supported by provider"}
      </p>
    </div>
  );
}
