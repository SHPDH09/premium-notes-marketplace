"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function AdminPlacedStudentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    displayName: "",
    company: "",
    role: "",
    packageLabel: "",
    story: "",
    sortOrder: "0",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/placed-students", { credentials: "include" });
    const data = await res.json();
    setItems(data.placedStudents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append("photo", photo);
    const res = await fetch("/api/admin/placed-students", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Placed student added");
    setForm({ displayName: "", company: "", role: "", packageLabel: "", story: "", sortOrder: "0" });
    setPhoto(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove?")) return;
    await fetch(`/api/admin/placed-students/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  if (loading) return <BrandLoading fullPage message="Loading…" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Placed students</h1>
        <p className="text-slate-500">Shown on student dashboard and placement page.</p>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Display name</Label>
          <Input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <Label>Package / offer</Label>
          <Input
            value={form.packageLabel}
            onChange={(e) => setForm({ ...form, packageLabel: e.target.value })}
            placeholder="12 LPA"
          />
        </div>
        <div>
          <Label>Photo</Label>
          <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </div>
        <div className="md:col-span-2">
          <Label>Story (optional)</Label>
          <Textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
        </div>
        <Button type="submit">Add profile</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <div key={s.id} className="rounded-xl border bg-white p-4">
            {s.photo ? (
              <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full">
                <Image src={s.photo} alt={s.displayName} fill className="object-cover" />
              </div>
            ) : null}
            <p className="font-semibold">{s.displayName}</p>
            <p className="text-sm text-slate-600">{s.company}</p>
            {s.packageLabel ? <p className="text-sm text-emerald-700">{s.packageLabel}</p> : null}
            <Button size="sm" variant="destructive" className="mt-3" onClick={() => void remove(s.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
