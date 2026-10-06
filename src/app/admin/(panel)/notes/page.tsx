"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/notes?${params}`);
    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/admin/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    toast.success("Note status updated");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
    toast.success("Note deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notes Management</h1>
        <Button asChild>
          <Link href="/admin/notes/create">Add Notes</Link>
        </Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search notes..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="border-t">
                  <td className="px-4 py-3">{n.title}</td>
                  <td className="px-4 py-3">{formatCurrency(n.price)}</td>
                  <td className="px-4 py-3">{formatCurrency(n.finalPrice)}</td>
                  <td className="px-4 py-3">{n.status}</td>
                  <td className="px-4 py-3">{new Date(n.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/notes/edit/${n.id}`}>Edit</Link>
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleStatus(n.id, n.status)}>
                        {n.status === "ACTIVE" ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(n.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
