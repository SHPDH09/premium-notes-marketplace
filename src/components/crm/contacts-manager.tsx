"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type ContactRow = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  companyName: string | null;
  source: string | null;
  status: string;
  tags: { id: string; name: string; color: string }[];
  assignedAgent: { id: string; name: string } | null;
  lastConversationAt: string | null;
  lastMessagePreview: string | null;
  conversationId: string | null;
  optedOut: boolean;
  createdAt: string;
};

type Stats = {
  total: number;
  newContacts: number;
  active: number;
  withOpenConversations: number;
  unassigned: number;
  addedThisMonth: number;
};

type Tag = { id: string; name: string; color: string };
type Member = { id: string; name: string };
type Segment = { id: string; name: string; count: number; builtin?: boolean };

export function ContactsManager({ isAdmin }: { isAdmin: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [q, setQ] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "import" | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    companyName: "",
    source: "manual",
    notes: "",
    assignedMemberId: "",
    tagIds: [] as string[],
    marketingConsent: false,
  });
  const [importCsv, setImportCsv] = useState("");
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [st, tg, mem, seg] = await Promise.all([
      fetch("/api/crm/contacts/stats", { credentials: "include" }),
      fetch("/api/crm/tags", { credentials: "include" }),
      fetch("/api/crm/team-members", { credentials: "include" }),
      fetch("/api/crm/contacts/segments", { credentials: "include" }),
    ]);
    const stD = await st.json();
    const tgD = await tg.json();
    const memD = await mem.json();
    const segD = await seg.json();
    if (st.ok) setStats(stD.stats);
    if (tg.ok) setTags(tgD.tags ?? []);
    if (mem.ok) setMembers(memD.members ?? []);
    if (seg.ok) setSegments(segD.segments ?? []);
  }, []);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());
    if (segmentId) params.set("segmentId", segmentId);
    if (tagFilter) params.set("tagId", tagFilter);
    const res = await fetch(`/api/crm/contacts?${params}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setContacts(data.contacts ?? []);
      setTotal(data.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, q, segmentId, tagFilter]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const t = setTimeout(() => void loadContacts(), 200);
    return () => clearTimeout(t);
  }, [loadContacts]);

  const statCards = useMemo(
    () =>
      stats
        ? [
            { label: "Total Contacts", value: stats.total },
            { label: "New (7 days)", value: stats.newContacts },
            { label: "Active (7 days)", value: stats.active },
            { label: "Open Conversations", value: stats.withOpenConversations },
            { label: "Unassigned", value: stats.unassigned },
            { label: "Added This Month", value: stats.addedThisMonth },
          ]
        : [],
    [stats]
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(contacts.map((c) => c.id)) : new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveContact() {
    const res = await fetch("/api/crm/contacts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedMemberId: form.assignedMemberId || null,
        tagIds: form.tagIds,
      }),
    });
    const data = await res.json();
    if (res.status === 409) {
      toast.error(`Duplicate: ${data.existing?.name ?? "contact"} (${data.existing?.phone})`);
      return;
    }
    if (!res.ok) {
      toast.error(data.error ?? "Could not save contact");
      return;
    }
    toast.success("Contact created");
    setModal(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      companyName: "",
      source: "manual",
      notes: "",
      assignedMemberId: "",
      tagIds: [],
      marketingConsent: false,
    });
    void loadContacts();
    void loadMeta();
  }

  async function runBulk(action: string, extra: Record<string, unknown> = {}) {
    if (!selected.size) return;
    if (action === "archive" && !confirm(`Archive ${selected.size} contact(s)?`)) return;
    const res = await fetch("/api/crm/contacts/bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: Array.from(selected), action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Bulk action failed");
      return;
    }
    toast.success(`Updated ${data.updated} contact(s)`);
    setSelected(new Set());
    void loadContacts();
  }

  async function previewImport() {
    const res = await fetch("/api/crm/contacts/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", csv: importCsv, fileName: "upload.csv" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Import preview failed");
      return;
    }
    setImportJobId(data.jobId);
    setImportSummary(
      `${data.previewTotal} valid, ${data.errorTotal} invalid of ${data.totalRows} rows (showing first 50 in preview).`
    );
    toast.success("Preview ready — confirm import");
  }

  async function confirmImport(mode: "skip" | "update") {
    if (!importJobId) return;
    const res = await fetch("/api/crm/contacts/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", jobId: importJobId, duplicateMode: mode }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Import failed");
      return;
    }
    toast.success(`Import done: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped`);
    setModal(null);
    setImportCsv("");
    setImportJobId(null);
    setImportSummary(null);
    void loadContacts();
    void loadMeta();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (segmentId) params.set("segmentId", segmentId);
    if (selected.size) params.set("ids", Array.from(selected).join(","));
    window.location.href = `/api/crm/contacts/export?${params}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-slate-400">Manage WhatsApp contacts for your company workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              <Button onClick={() => setModal("add")}>Add Contact</Button>
              <Button variant="outline" onClick={() => setModal("import")}>
                Import CSV
              </Button>
            </>
          ) : null}
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="border-slate-800 bg-slate-900">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-semibold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs border-slate-700 bg-slate-950"
          placeholder="Search name, phone, email, tags…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={segmentId}
          onChange={(e) => {
            setPage(1);
            setSegmentId(e.target.value);
          }}
        >
          <option value="">All segments</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={tagFilter}
          onChange={(e) => {
            setPage(1);
            setTagFilter(e.target.value);
          }}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 && isAdmin ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <select
            id="bulk-assign"
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) void runBulk("assign", { assignedMemberId: e.target.value });
              e.target.value = "";
            }}
          >
            <option value="">Assign to…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void runBulk("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            Export selected
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {isAdmin ? (
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selected.size === contacts.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
              ) : null}
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">WhatsApp</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Last message</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  No contacts found.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-t border-slate-800 bg-slate-950/50">
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-medium text-white">
                    <Link href={`/crm/contacts/${c.id}`} className="hover:text-emerald-400">
                      {c.name || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{c.phone}</td>
                  <td className="px-3 py-2 text-slate-400">{c.email || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{c.companyName || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t.id}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{ backgroundColor: `${t.color}33`, color: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{c.assignedAgent?.name ?? "—"}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-slate-500">
                    {c.lastMessagePreview || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{c.source || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={c.optedOut ? "text-red-400" : "text-emerald-400"}>{c.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    {c.conversationId ? (
                      <Link
                        href={`/crm/inbox?conversation=${c.conversationId}`}
                        className="text-emerald-400 hover:underline"
                      >
                        Open chat
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600">No chat yet</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages} · {total} contacts
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
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

      {modal === "add" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-slate-700 bg-slate-900">
            <CardContent className="space-y-3 pt-6">
              <h2 className="text-lg font-semibold text-white">Add contact</h2>
              {(
                [
                  ["name", "Full name", "text"],
                  ["phone", "WhatsApp phone (+ country code)", "text"],
                  ["email", "Email", "email"],
                  ["companyName", "Company name", "text"],
                  ["source", "Source", "text"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs text-slate-500">{label}</label>
                  <Input
                    type={type}
                    className="mt-1 border-slate-700 bg-slate-950"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500">Assigned agent</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={form.assignedMemberId}
                  onChange={(e) => setForm((f) => ({ ...f, assignedMemberId: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Tags</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-1 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.tagIds.includes(t.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            tagIds: e.target.checked
                              ? [...f.tagIds, t.id]
                              : f.tagIds.filter((id) => id !== t.id),
                          }))
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(e) => setForm((f) => ({ ...f, marketingConsent: e.target.checked }))}
                />
                Marketing consent recorded
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveContact()}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {modal === "import" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-slate-700 bg-slate-900">
            <CardContent className="space-y-3 pt-6">
              <h2 className="text-lg font-semibold text-white">Import CSV</h2>
              <p className="text-xs text-slate-400">
                Paste CSV with headers (name, phone, email, company). Preview validates rows before import.
              </p>
              <textarea
                className="min-h-[160px] w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200"
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
              />
              {importSummary ? <p className="text-sm text-amber-200">{importSummary}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => void previewImport()}>
                  Preview
                </Button>
                {importJobId ? (
                  <>
                    <Button variant="outline" onClick={() => void confirmImport("skip")}>
                      Import (skip duplicates)
                    </Button>
                    <Button onClick={() => void confirmImport("update")}>Import (update duplicates)</Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
