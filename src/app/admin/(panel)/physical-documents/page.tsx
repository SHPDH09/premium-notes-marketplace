"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPhysicalDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/physical-documents?${params}`);
    const data = await res.json();
    setDocs(data.documents ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(id: string, status: string) {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    await fetch(`/api/admin/physical-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...doc,
        status: status === "ACTIVE" ? "DISABLED" : "ACTIVE",
        printingCost: doc.printingCost,
        bindingCost: doc.bindingCost,
        packagingCost: doc.packagingCost,
        basePrice: doc.basePrice,
      }),
    });
    toast.success("Updated");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-bold">Physical Documents</h1>
        <Button asChild>
          <Link href="/admin/physical-documents/create">Add document</Link>
        </Button>
      </div>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
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
                <th className="px-4 py-3">Price/copy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{formatCurrency(d.finalPrice)}</td>
                  <td className="px-4 py-3">{d.status}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/physical-documents/${d.id}`}>Edit</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(d.id, d.status)}>
                      Toggle
                    </Button>
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
