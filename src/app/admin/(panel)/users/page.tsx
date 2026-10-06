"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";
import { formatApiError } from "@/lib/api/format-api-error";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  totalPurchases: number;
  status: string;
};

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "ACTIVE" as const,
  showOnHomepage: false,
  homepageInstitute: "",
  homepageHeadline: "Featured Student",
  homepageQuote: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StudentRow[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonResponse<{ users?: StudentRow[]; error?: unknown }>(res);
      if (!res.ok) {
        toast.error(formatApiError(data.error));
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      toast.error("Failed to load students");
    }
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse<{ error?: unknown }>(res);
      if (!res.ok) {
        toast.error(formatApiError(data.error));
        return;
      }
      toast.success("Student created");
      setForm(initialForm);
      await load();
    } catch {
      toast.error("Network error while creating student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Management</h1>
      <form onSubmit={addStudent} className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Password (min 8 chars)</Label>
            <Input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Adding…" : "Add Student"}
            </Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.showOnHomepage}
            onChange={(e) => setForm({ ...form, showOnHomepage: e.target.checked })}
          />
          Show this student on home page (spotlight)
        </label>
        {form.showOnHomepage && (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Institute / College</Label>
              <Input
                value={form.homepageInstitute}
                onChange={(e) => setForm({ ...form, homepageInstitute: e.target.value })}
                placeholder="Testmile College"
              />
            </div>
            <div>
              <Label>Headline</Label>
              <Input
                value={form.homepageHeadline}
                onChange={(e) => setForm({ ...form, homepageHeadline: e.target.value })}
              />
            </div>
            <div>
              <Label>Quote</Label>
              <Input value={form.homepageQuote} onChange={(e) => setForm({ ...form, homepageQuote: e.target.value })} />
            </div>
          </div>
        )}
      </form>
      <div className="flex gap-2">
        <Input placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => void load()}>
          Search
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Purchases</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.totalPurchases ?? 0}</td>
                  <td className="px-4 py-3">{u.status}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/users/${u.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="p-6 text-center text-slate-500">No students yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
