"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";
import { uploadAdminFileDirect } from "@/lib/direct-upload-client";

type Collaborator = {
  id: string;
  name: string;
  type: string;
  logoImage: string | null;
  website: string | null;
  description: string | null;
  status: string;
  sortOrder: number;
};

export default function AdminCollaboratorsPage() {
  const [items, setItems] = useState<Collaborator[]>([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    type: "COMPANY",
    website: "",
    description: "",
    sortOrder: "0",
    status: "ACTIVE",
  });
  const [logo, setLogo] = useState<File | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`/api/admin/collaborators?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonResponse<{ collaborators?: Collaborator[] }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load collaborators");
        setItems([]);
        return;
      }
      setItems(data.collaborators ?? []);
    } catch {
      toast.error("Network error while loading collaborators");
      setItems([]);
    }
  }

  useEffect(() => {
    void load().catch(() => {
      toast.error("Failed to load collaborators");
      setItems([]);
    });
  }, [filter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      let logoStorageKey: string | null = null;
      if (logo) {
        const uploaded = await uploadAdminFileDirect(logo, "covers");
        if ("error" in uploaded) {
          toast.error(uploaded.error);
          return;
        }
        logoStorageKey = uploaded.key;
      }
      const res = await fetch("/api/admin/collaborators", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoStorageKey }),
      });
      const data = await readJsonResponse<{ error?: string; warning?: string }>(res);
      if (!res.ok) return toast.error(data.error ?? "Failed to add collaborator");
      toast.success("Collaborator added");
      if (data.warning) toast.warning(data.warning);
      setForm({ name: "", type: "COMPANY", website: "", description: "", sortOrder: "0", status: "ACTIVE" });
      setLogo(null);
      load();
    } catch {
      toast.error("Network error while saving collaborator");
    }
  }

  async function toggle(id: string, status: string) {
    const res = await fetch(`/api/admin/collaborators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(data.error ?? "Update failed");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this collaborator?")) return;
    const res = await fetch(`/api/admin/collaborators/${id}`, { method: "DELETE" });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(data.error ?? "Delete failed");
    toast.success("Deleted");
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Collaborations</h1>
        <p className="text-slate-500">Manage companies, colleges, and institutes shown on the home page.</p>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="COMPANY">Company</option>
            <option value="COLLEGE">College</option>
            <option value="INSTITUTE">Institute</option>
          </select>
        </div>
        <div>
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
        </div>
        <div>
          <Label>Logo</Label>
          <Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Button type="submit">Add Collaborator</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {["all", "COMPANY", "COLLEGE", "INSTITUTE"].map((t) => (
          <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)}>
            {t === "all" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="relative h-10 w-16">
                      {c.logoImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoImage} alt="" className="h-10 w-16 object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggle(c.id, c.status)}>
                        Toggle
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="p-8 text-center text-slate-500">No collaborators yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
