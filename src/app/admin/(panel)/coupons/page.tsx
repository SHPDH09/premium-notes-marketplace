"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { NotePicker } from "@/components/admin/note-picker";
import { PhysicalDocumentPicker } from "@/components/admin/physical-document-picker";

const APPLIES_LABEL: Record<string, string> = {
  NOTE: "Digital notes",
  PHYSICAL: "Physical print",
  BOTH: "Digital + physical",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [physicalDocs, setPhysicalDocs] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState<any>({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxUsers: "",
    validFrom: "",
    validUntil: "",
    minPurchaseAmount: 0,
    maxDiscount: "",
    appliesTo: "BOTH",
    noteIds: [] as string[],
    physicalDocumentIds: [] as string[],
  });

  async function load() {
    const [c, n, p] = await Promise.all([
      fetch("/api/admin/coupons").then((r) => r.json()),
      fetch("/api/admin/notes").then((r) => r.json()),
      fetch("/api/admin/physical-documents").then((r) => r.json()),
    ]);
    setCoupons(c.coupons ?? []);
    setNotes(n.notes ?? []);
    setPhysicalDocs(
      (p.documents ?? []).map((d: { id: string; title: string }) => ({ id: d.id, title: d.title }))
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      }),
    });
    if (!res.ok) return toast.error("Could not create coupon");
    toast.success("Coupon created successfully.");
    load();
  }

  async function toggle(id: string, status: string) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete coupon?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    toast.success("Coupon deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coupon Management</h1>
      <form onSubmit={createCoupon} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-3">
        <div>
          <Label>Code</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        </div>
        <div>
          <Label>Discount Type</Label>
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
        </div>
        <div>
          <Label>Discount Value</Label>
          <Input
            type="number"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label>Max Users</Label>
          <Input value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} />
        </div>
        <div>
          <Label>Valid From</Label>
          <Input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
        </div>
        <div>
          <Label>Valid Until</Label>
          <Input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required />
        </div>
        <div>
          <Label>Applies to</Label>
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={form.appliesTo}
            onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
          >
            <option value="BOTH">Digital notes + physical print</option>
            <option value="NOTE">Digital notes only</option>
            <option value="PHYSICAL">Physical print only</option>
          </select>
        </div>
        <div className="relative md:col-span-3">
          <Label>Applicable Notes (leave empty for all)</Label>
          <div className="mt-2">
            <NotePicker
              notes={notes.map((n) => ({ id: n.id, title: n.title }))}
              value={form.noteIds}
              onChange={(noteIds) => setForm({ ...form, noteIds })}
              placeholder="Search or pick notes from dropdown…"
            />
          </div>
        </div>
        {(form.appliesTo === "PHYSICAL" || form.appliesTo === "BOTH") && (
          <div className="relative md:col-span-3">
            <Label>Applicable physical documents (leave empty for all)</Label>
            <div className="mt-2">
              <PhysicalDocumentPicker
                documents={physicalDocs}
                value={form.physicalDocumentIds}
                onChange={(physicalDocumentIds) => setForm({ ...form, physicalDocumentIds })}
              />
            </div>
          </div>
        )}
        <Button type="submit">Create Coupon</Button>
      </form>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Applies to</th>
                <th className="px-4 py-3 text-left">Usage</th>
                <th className="px-4 py-3 text-left">Valid Until</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3 text-xs">
                    {APPLIES_LABEL[c.appliesTo] ?? c.appliesTo}
                  </td>
                  <td className="px-4 py-3">
                    {c.usedCount}/{c.maxUsers ?? "∞"}
                  </td>
                  <td className="px-4 py-3">{new Date(c.validUntil).toLocaleString()}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const next =
                            c.appliesTo === "NOTE"
                              ? "BOTH"
                              : c.appliesTo === "BOTH"
                                ? "PHYSICAL"
                                : "NOTE";
                          await fetch(`/api/admin/coupons/${c.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ appliesTo: next }),
                          });
                          toast.success(`Applies to: ${APPLIES_LABEL[next]}`);
                          load();
                        }}
                      >
                        Scope
                      </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
