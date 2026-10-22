"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
  planId: string | null;
  expiresAt: string | null;
  createdAt: string;
  agents: number;
  activeAgents: number;
  whatsappNumbers: number;
  conversations: number;
  contacts: number;
  messagesInbound: number;
  messagesOutbound: number;
  messagesTotal: number;
};

type CompanyDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planName: string | null;
  stats: {
    agents: number;
    activeAgents: number;
    messagesTotal: number;
    messagesInbound: number;
    messagesOutbound: number;
    conversations: number;
  };
  members: {
    id: string;
    memberRole: string;
    isActive: boolean;
    user: { name: string; email: string; role: string };
  }[];
};

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", status: "ACTIVE" as "ACTIVE" | "SUSPENDED" });
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/companies", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setCompanies(data.companies ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/super-admin/companies", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success("Company created");
    setForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
    void load();
  }

  function startEdit(row: CompanyRow) {
    setEditId(row.id);
    setEditForm({ name: row.name, slug: row.slug, status: row.status as "ACTIVE" | "SUSPENDED" });
    setDetail(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const res = await fetch(`/api/super-admin/companies/${editId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Update failed");
      return;
    }
    toast.success("Company updated");
    setEditId(null);
    void load();
  }

  async function toggleSuspend(row: CompanyRow) {
    const next = row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/super-admin/companies/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      toast.error("Could not update status");
      return;
    }
    toast.success(next === "SUSPENDED" ? "Company suspended" : "Company reactivated");
    void load();
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setEditId(null);
    const res = await fetch(`/api/super-admin/companies/${id}`, { credentials: "include" });
    const data = await res.json();
    setDetailLoading(false);
    if (!res.ok) {
      toast.error("Could not load details");
      return;
    }
    setDetail(data.company);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="mt-1 text-sm text-slate-400">Manage tenant workspaces, agents, and message volume.</p>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-400">Create company</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createCompany} className="grid max-w-xl gap-3 sm:grid-cols-2">
            <Input
              placeholder="Company name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border-slate-700 bg-slate-950 sm:col-span-2"
              required
            />
            <Input
              placeholder="slug (e.g. acme-corp)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              className="border-slate-700 bg-slate-950"
              required
            />
            <Input
              placeholder="Admin name"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              className="border-slate-700 bg-slate-950"
              required
            />
            <Input
              placeholder="Admin email"
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="border-slate-700 bg-slate-950"
              required
            />
            <Input
              placeholder="Admin password"
              type="password"
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              className="border-slate-700 bg-slate-950 sm:col-span-2"
              required
              minLength={8}
            />
            <Button type="submit" className="sm:col-span-2 w-fit">
              Create company
            </Button>
          </form>
        </CardContent>
      </Card>

      {editId ? (
        <Card className="border-emerald-900/50 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">Edit company</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveEdit} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Slug</label>
                <Input
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "SUSPENDED" })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <Button type="submit">Save</Button>
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {detail ? (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{detail.name} — team & messages</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="flex flex-wrap gap-4">
              <Stat label="Agents" value={detail.stats.agents} sub={`${detail.stats.activeAgents} active`} />
              <Stat label="Messages" value={detail.stats.messagesTotal} sub={`↓${detail.stats.messagesInbound} ↑${detail.stats.messagesOutbound}`} />
              <Stat label="Chats" value={detail.stats.conversations} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Members</p>
              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                {detail.members.map((m) => (
                  <li key={m.id} className="flex justify-between px-3 py-2">
                    <span>
                      {m.user.name}{" "}
                      <span className="text-slate-500">({m.user.email})</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.memberRole} · {m.isActive ? "active" : "inactive"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">All companies</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-6 text-slate-500">Loading…</p>
          ) : !companies.length ? (
            <p className="p-6 text-slate-500">No companies yet.</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Agents</th>
                  <th className="px-4 py-3 font-medium text-center">WhatsApp #</th>
                  <th className="px-4 py-3 font-medium text-center">Chats</th>
                  <th className="px-4 py-3 font-medium text-center">Messages</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/80 hover:bg-slate-950/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.plan ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-900/40 text-emerald-300"
                            : "bg-rose-900/40 text-rose-300"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {c.activeAgents}/{c.agents}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{c.whatsappNumbers}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{c.conversations}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-white">{c.messagesTotal}</span>
                      <span className="block text-[10px] text-slate-500">
                        in {c.messagesInbound} · out {c.messagesOutbound}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => void openDetail(c.id)} disabled={detailLoading}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={c.status === "ACTIVE" ? "destructive" : "default"}
                          onClick={() => void toggleSuspend(c)}
                        >
                          {c.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-emerald-400">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
