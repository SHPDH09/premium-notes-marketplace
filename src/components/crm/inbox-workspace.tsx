"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CallActionButton } from "@/components/crm/call-action-button";
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
  assigneeName?: string | null;
  contact?: { name: string | null; phone: string; id?: string };
};

type Message = {
  id: string;
  direction: string;
  messageType: string;
  bodyText: string | null;
  displayText?: string;
  mediaUrl: string | null;
  mediaDisplayUrl?: string | null;
  deliveryStatus: string;
  deliveryError: string | null;
  sentAt: string;
  repliedByLabel: string | null;
};

type ConvDetail = Conversation & {
  chatJid?: string;
  contact?: { name: string | null; phone: string; id?: string; email?: string | null };
  assignee?: { id: string; name: string } | null;
  tags?: { id: string; name: string; color: string }[];
  assignmentHistory?: {
    id: string;
    createdAt: string;
    note: string | null;
    from: string | null;
    to: string | null;
    by: string | null;
  }[];
};

type Member = { id: string; name: string };
type Tag = { id: string; name: string; color: string };

type MobilePanel = "list" | "chat" | "details";

const EMOJI = ["😊", "👍", "🙏", "✅", "❓", "📞", "📎"];

function statusLabel(status: string) {
  switch (status) {
    case "QUEUED":
      return "Sending…";
    case "SENT":
      return "Sent";
    case "DELIVERED":
      return "Delivered";
    case "READ":
      return "Read";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function InboxWorkspace({
  memberId,
  initialConversationId,
  isAdmin = false,
}: {
  memberId?: string;
  initialConversationId?: string;
  isAdmin?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "unassigned" | "mine" | "unread">("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("latest");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<{ id: string; body: string; author: string; createdAt: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("list");
  const [pollSince, setPollSince] = useState(() => new Date().toISOString());

  const loadMeta = useCallback(async () => {
    const [memRes, tagRes, qrRes] = await Promise.all([
      fetch("/api/crm/team-members", { credentials: "include" }),
      fetch("/api/crm/tags", { credentials: "include" }),
      fetch("/api/crm/inbox/quick-replies", { credentials: "include" }),
    ]);
    const mem = await memRes.json();
    const tags = await tagRes.json();
    const qr = await qrRes.json();
    if (memRes.ok) setMembers(mem.members ?? []);
    if (tagRes.ok) setAllTags(tags.tags ?? []);
    if (qrRes.ok) setQuickReplies(qr.quickReplies ?? []);
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    const params = new URLSearchParams();
    if (filter === "unassigned") params.set("assigned", "unassigned");
    if (filter === "mine" && memberId) params.set("assigned", "me");
    if (filter === "unread") params.set("unread", "1");
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (agentFilter && isAdmin) params.set("agentId", agentFilter);
    if (sort) params.set("sort", sort);
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/crm/conversations?${params}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setConversations(data.conversations ?? []);
    setListLoading(false);
  }, [filter, statusFilter, priorityFilter, agentFilter, sort, search, memberId, isAdmin]);

  const loadThread = useCallback(async (id: string) => {
    await fetch(`/api/crm/conversations/${id}/sync-messages`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);

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
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
      setMobilePanel("chat");
    }
  }, [initialConversationId]);

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

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobilePanel("chat");
  }

  async function sendAttachment(file: File) {
    if (!selectedId || composerMode === "note") return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File must be 16 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (draft.trim()) form.append("caption", draft.trim());
      const res = await fetch(`/api/crm/conversations/${selectedId}/messages`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      setDraft("");
      toast.success("Attachment sent");
      void loadThread(selectedId);
      void loadList();
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    if (!selectedId || !draft.trim()) return;
    if (composerMode === "note") {
      const res = await fetch(`/api/crm/conversations/${selectedId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) {
        toast.error("Could not save note");
        return;
      }
      setDraft("");
      toast.success("Internal note saved");
      void loadThread(selectedId);
      return;
    }

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
        void loadThread(selectedId);
        return;
      }
      setDraft("");
      void loadThread(selectedId);
      void loadList();
    } finally {
      setSending(false);
    }
  }

  async function retryMessage(messageId: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/crm/conversations/${selectedId}/messages`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", messageId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Retry failed");
      return;
    }
    toast.success("Message resent");
    void loadThread(selectedId);
  }

  async function patchConversation(patch: { status?: string; priority?: string }) {
    if (!selectedId) return;
    const res = await fetch(`/api/crm/conversations/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    void loadThread(selectedId);
    void loadList();
  }

  async function assignTo(memberIdTarget: string | null) {
    if (!selectedId) return;
    const res = await fetch(`/api/crm/conversations/${selectedId}/assign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toMemberId: memberIdTarget }),
    });
    if (!res.ok) {
      toast.error("Assignment failed");
      return;
    }
    toast.success(memberIdTarget ? "Conversation assigned" : "Unassigned");
    void loadThread(selectedId);
    void loadList();
  }

  async function updateTags(tagIds: string[]) {
    if (!selectedId) return;
    const res = await fetch(`/api/crm/conversations/${selectedId}/tags`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });
    if (!res.ok) {
      toast.error("Could not update labels");
      return;
    }
    void loadThread(selectedId);
  }

  const selectedTagIds = useMemo(
    () => new Set((detail?.tags ?? []).map((t) => t.id)),
    [detail?.tags]
  );

  const listPanel = (
    <section
      className={`flex w-full flex-col border-r border-slate-800 md:w-80 lg:w-96 ${
        mobilePanel !== "list" ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="space-y-2 border-b border-slate-800 p-3">
        <Input
          placeholder="Search name, phone, or preview…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-700 bg-slate-900"
        />
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "All"],
              ["mine", "My chats"],
              ["unassigned", "Unassigned"],
              ["unread", "Unread"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                filter === f ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Any status</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Archived</option>
          </select>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">Any priority</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        {isAdmin ? (
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
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
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">Latest message</option>
          <option value="oldest_unanswered">Oldest activity</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto">
        {listLoading ? (
          <p className="p-4 text-center text-sm text-slate-500">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500">No conversations match these filters.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConversation(c.id)}
              className={`w-full border-b border-slate-800/80 px-3 py-3 text-left text-sm hover:bg-slate-900 ${
                selectedId === c.id ? "bg-slate-900" : ""
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-white">
                  {c.contact?.name || c.contact?.phone || "Unknown"}
                </span>
                <div className="flex items-center gap-1">
                  {c.priority !== "NORMAL" ? (
                    <span className="text-[10px] text-amber-400">{c.priority}</span>
                  ) : null}
                  {c.unreadCount > 0 ? (
                    <span className="rounded-full bg-emerald-600 px-1.5 text-xs">{c.unreadCount}</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {c.assigneeName ?? "Unassigned"} · {c.status}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{c.lastMessagePreview}</p>
            </button>
          ))
        )}
      </div>
    </section>
  );

  const chatPanel = (
    <section
      className={`flex min-w-0 flex-1 flex-col ${
        mobilePanel !== "chat" ? "hidden md:flex" : "flex"
      }`}
    >
      {!selectedId ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">Select a conversation</div>
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div className="min-w-0">
              <button
                type="button"
                className="mr-2 text-xs text-emerald-400 md:hidden"
                onClick={() => setMobilePanel("list")}
              >
                ← Chats
              </button>
              <p className="truncate font-semibold text-white">
                {detail?.contact?.name || detail?.contact?.phone}
              </p>
              <p className="text-xs text-slate-400">
                {detail?.status} · {detail?.assignee?.name ?? "Unassigned"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {detail?.contact ? (
                <CallActionButton
                  contactId={detail.contact.id}
                  conversationId={selectedId ?? undefined}
                  phone={detail.contact.phone}
                />
              ) : null}
              {!detail?.assignee && memberId ? (
                <Button size="sm" variant="outline" onClick={() => void assignTo(memberId)}>
                  Take chat
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setMobilePanel("details")}>
                Details
              </Button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === "OUTBOUND" ? "ml-auto bg-emerald-900/40" : "bg-slate-800"
                }`}
              >
                {m.mediaDisplayUrl || m.mediaUrl ? (
                  m.messageType === "image" && (m.mediaDisplayUrl || m.mediaUrl) ? (
                    <a href={m.mediaDisplayUrl ?? m.mediaUrl ?? "#"} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.mediaDisplayUrl ?? m.mediaUrl ?? ""}
                        alt=""
                        className="mb-2 max-h-48 rounded-md object-contain"
                      />
                    </a>
                  ) : (
                    <a
                      href={m.mediaDisplayUrl ?? m.mediaUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 block text-emerald-300 underline"
                    >
                      Open {m.messageType} attachment
                    </a>
                  )
                ) : null}
                <p className="whitespace-pre-wrap">
                  {(m.bodyText ?? "").trim() || m.displayText || `[${m.messageType}]`}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(m.sentAt).toLocaleString()} · {statusLabel(m.deliveryStatus)}
                  {m.repliedByLabel ? ` · ${m.repliedByLabel}` : ""}
                </p>
                {m.deliveryStatus === "FAILED" && m.direction === "OUTBOUND" ? (
                  <div className="mt-1">
                    <p className="text-[10px] text-red-300">{m.deliveryError ?? "Send failed"}</p>
                    <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={() => void retryMessage(m.id)}>
                      Retry
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <footer className="border-t border-slate-800 p-3">
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                className={`rounded px-2 py-0.5 text-xs ${
                  composerMode === "reply" ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-300"
                }`}
                onClick={() => setComposerMode("reply")}
              >
                Reply
              </button>
              <button
                type="button"
                className={`rounded px-2 py-0.5 text-xs ${
                  composerMode === "note" ? "bg-amber-800 text-white" : "bg-slate-800 text-slate-300"
                }`}
                onClick={() => setComposerMode("note")}
              >
                Internal note
              </button>
              {quickReplies.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  className="max-w-[120px] truncate rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                  onClick={() => setDraft(q)}
                  title={q}
                >
                  Quick reply
                </button>
              ))}
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded bg-slate-800 px-1.5 text-sm"
                  onClick={() => setDraft((d) => d + e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {composerMode === "reply" ? (
                <label className="flex cursor-pointer items-center rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300 hover:bg-slate-800">
                  📎
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void sendAttachment(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  composerMode === "note"
                    ? "Internal note (not sent to customer)…"
                    : "Type a reply or caption for attachment…"
                }
                className="border-slate-700 bg-slate-900"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void sendMessage())}
              />
              <Button onClick={() => void sendMessage()} disabled={sending || uploading}>
                {composerMode === "note" ? "Save" : sending || uploading ? "…" : "Send"}
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Attach images or PDFs (max 16 MB). If inbound text is blank, enable content storage in WALayer or we sync from WhatsApp history automatically.
            </p>
          </footer>
        </>
      )}
    </section>
  );

  const detailsPanel = (
    <section
      className={`w-full shrink-0 flex-col border-l border-slate-800 p-4 md:flex md:w-80 lg:w-96 ${
        mobilePanel === "details" ? "flex" : "hidden lg:flex"
      }`}
    >
      <div className="mb-2 flex items-center justify-between lg:hidden">
        <button type="button" className="text-xs text-emerald-400" onClick={() => setMobilePanel("chat")}>
          ← Back to chat
        </button>
      </div>
      {!detail ? (
        <p className="text-sm text-slate-500">Select a chat to view details.</p>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-emerald-400">Contact</h3>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <p>{detail.contact?.phone}</p>
            {detail.contact?.id ? (
              <Link href={`/crm/contacts/${detail.contact.id}`} className="text-xs text-emerald-400 hover:underline">
                Open contact profile
              </Link>
            ) : null}
          </div>

          <h3 className="mt-4 text-sm font-semibold text-emerald-400">Conversation</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              value={detail.status}
              onChange={(e) => void patchConversation({ status: e.target.value })}
            >
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Archived</option>
            </select>
            <select
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              value={detail.priority}
              onChange={(e) => void patchConversation({ priority: e.target.value })}
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <h3 className="mt-4 text-xs font-medium text-slate-400">Assign to</h3>
          <select
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            value={detail.assignee?.id ?? ""}
            onChange={(e) => void assignTo(e.target.value || null)}
            disabled={!isAdmin && detail.assignee?.id !== memberId}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {!isAdmin ? (
            <p className="mt-1 text-[10px] text-slate-500">Agents can take unassigned chats or reassign their own.</p>
          ) : null}

          <h3 className="mt-4 text-xs font-medium text-slate-400">Labels</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {allTags.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(t.id)}
                  onChange={(e) => {
                    const next = new Set(selectedTagIds);
                    if (e.target.checked) next.add(t.id);
                    else next.delete(t.id);
                    void updateTags(Array.from(next));
                  }}
                />
                {t.name}
              </label>
            ))}
          </div>

          <h3 className="mt-4 text-sm font-semibold text-emerald-400">Internal notes</h3>
          <div className="mt-2 max-h-32 space-y-2 overflow-y-auto text-xs text-slate-400">
            {notes.map((n) => (
              <div key={n.id} className="rounded bg-slate-900 p-2">
                <p>{n.body}</p>
                <p className="mt-1 text-[10px]">{n.author}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-4 text-xs font-medium text-slate-400">Assignment history</h3>
          <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-[10px] text-slate-500">
            {(detail.assignmentHistory ?? []).map((a) => (
              <li key={a.id}>
                {new Date(a.createdAt).toLocaleString()}: {a.from ?? "—"} → {a.to ?? "—"} ({a.by ?? "system"})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );

  return (
    <div className="flex h-[calc(100dvh-0px)] flex-col md:flex-row">
      {listPanel}
      {chatPanel}
      {detailsPanel}
    </div>
  );
}
