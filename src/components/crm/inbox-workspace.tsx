"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Conversation = {
  id: string;
  status: string;
  priority: string;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  assignedMemberId: string | null;
  contact?: { name: string | null; phone: string };
};

type Message = {
  id: string;
  direction: string;
  bodyText: string | null;
  deliveryStatus: string;
  sentAt: string;
  repliedByLabel: string | null;
};

type ConvDetail = Conversation & {
  chatJid?: string;
  contact?: { name: string | null; phone: string; id?: string };
  assignee?: { id: string; name: string } | null;
};

export function InboxWorkspace({ memberId }: { memberId?: string }) {
  const [filter, setFilter] = useState<"all" | "unassigned" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<{ id: string; body: string; author: string; createdAt: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pollSince, setPollSince] = useState(() => new Date().toISOString());

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "unassigned") params.set("assigned", "unassigned");
    if (filter === "mine" && memberId) params.set("assigned", "me");
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/crm/conversations?${params}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setConversations(data.conversations ?? []);
  }, [filter, statusFilter, search, memberId]);

  const loadThread = useCallback(async (id: string) => {
    const [cRes, mRes, nRes] = await Promise.all([
      fetch(`/api/crm/conversations/${id}`, { credentials: "include" }),
      fetch(`/api/crm/conversations/${id}/messages`, { credentials: "include" }),
      fetch(`/api/crm/conversations/${id}/notes`, { credentials: "include" }),
    ]);
    const cData = await cRes.json();
    const mData = await mRes.json();
    const nData = await nRes.json();
    if (cRes.ok) setDetail(cData.conversation);
    if (mRes.ok) setMessages(mData.messages ?? []);
    if (nRes.ok) setNotes(nData.notes ?? []);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/crm/poll?since=${encodeURIComponent(pollSince)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return;
      setPollSince(data.serverTime ?? new Date().toISOString());
      if (data.conversations?.length) {
        void loadList();
        if (selectedId) void loadThread(selectedId);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pollSince, selectedId, loadList, loadThread]);

  async function sendMessage() {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/crm/conversations/${selectedId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Send failed");
        return;
      }
      setDraft("");
      void loadThread(selectedId);
      void loadList();
    } finally {
      setSending(false);
    }
  }

  async function saveNote() {
    if (!selectedId || !noteDraft.trim()) return;
    const res = await fetch(`/api/crm/conversations/${selectedId}/notes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteDraft.trim() }),
    });
    if (!res.ok) {
      toast.error("Could not save note");
      return;
    }
    setNoteDraft("");
    void loadThread(selectedId);
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col md:flex-row">
      <section className="flex w-full flex-col border-r border-slate-800 md:w-80 lg:w-96">
        <div className="space-y-2 border-b border-slate-800 p-3">
          <Input
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-700 bg-slate-900"
          />
          <div className="flex flex-wrap gap-1">
            {(["all", "unassigned", "mine"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2 py-0.5 text-xs ${filter === f ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
              >
                {f === "all" ? "All" : f === "mine" ? "My chats" : "Unassigned"}
              </button>
            ))}
          </div>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Any status</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full border-b border-slate-800/80 px-3 py-3 text-left text-sm hover:bg-slate-900 ${selectedId === c.id ? "bg-slate-900" : ""}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-white">
                  {c.contact?.name || c.contact?.phone || "Unknown"}
                </span>
                {c.unreadCount > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-1.5 text-xs">{c.unreadCount}</span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{c.lastMessagePreview}</p>
            </button>
          ))}
          {!conversations.length ? (
            <p className="p-4 text-center text-sm text-slate-500">No conversations yet.</p>
          ) : null}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">Select a conversation</div>
        ) : (
          <>
            <header className="border-b border-slate-800 px-4 py-3">
              <p className="font-semibold text-white">{detail?.contact?.name || detail?.contact?.phone}</p>
              <p className="text-xs text-slate-400">{detail?.status} · {detail?.assignee?.name ?? "Unassigned"}</p>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.direction === "OUTBOUND" ? "ml-auto bg-emerald-900/40" : "bg-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.bodyText}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(m.sentAt).toLocaleString()} · {m.deliveryStatus}
                    {m.repliedByLabel ? ` · ${m.repliedByLabel}` : ""}
                  </p>
                </div>
              ))}
            </div>
            <footer className="border-t border-slate-800 p-3">
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a reply…"
                  className="border-slate-700 bg-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void sendMessage())}
                />
                <Button onClick={() => void sendMessage()} disabled={sending}>
                  Send
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>

      <section className="hidden w-72 shrink-0 border-l border-slate-800 p-4 lg:block">
        <h3 className="text-sm font-semibold text-emerald-400">Customer</h3>
        {detail ? (
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <p>{detail.contact?.phone}</p>
            <p>Status: {detail.status}</p>
          </div>
        ) : null}
        <h3 className="mt-6 text-sm font-semibold text-emerald-400">Internal notes</h3>
        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-slate-400">
          {notes.map((n) => (
            <div key={n.id} className="rounded bg-slate-900 p-2">
              <p>{n.body}</p>
              <p className="mt-1 text-[10px]">{n.author}</p>
            </div>
          ))}
        </div>
        <Input
          className="mt-2 border-slate-700 bg-slate-900 text-sm"
          placeholder="Add internal note…"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
        />
        <Button size="sm" className="mt-2 w-full" variant="outline" onClick={() => void saveNote()}>
          Save note
        </Button>
      </section>
    </div>
  );
}
