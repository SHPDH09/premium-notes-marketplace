"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { calculateFinalPrice } from "@/lib/pricing";

type Props = {
  mode: "create" | "edit";
  noteId?: string;
  initial?: any;
};

export function NoteForm({ mode, noteId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    notesLink: initial?.notesLink ?? "",
    price: initial?.price ?? 0,
    discountType: initial?.discountType ?? "PERCENTAGE",
    discountValue: initial?.discountValue ?? 0,
    status: initial?.status ?? "ACTIVE",
    freePreviewPages: initial?.freePreviewPages ?? 2,
  });
  const [cover, setCover] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const finalPreview = calculateFinalPrice(
    Number(form.price),
    form.discountType as "PERCENTAGE" | "FIXED",
    Number(form.discountValue)
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (cover) fd.append("cover", cover);
    if (pdf) fd.append("pdf", pdf);

    const url = mode === "create" ? "/api/admin/notes" : `/api/admin/notes/${noteId}`;
    const res = await fetch(url, { method: mode === "create" ? "POST" : "PATCH", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success(mode === "create" ? "Note added successfully." : "Note updated successfully.");
    router.push("/admin/notes");
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-4 rounded-2xl border bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Notes Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Notes Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Cover Image</Label>
          <Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label>Upload PDF</Label>
          <Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <div>
        <Label>External Notes Link (optional if PDF uploaded)</Label>
        <Input value={form.notesLink} onChange={(e) => setForm({ ...form, notesLink: e.target.value })} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label>Price</Label>
          <Input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            required
          />
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
            step="0.01"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Final Price (auto)</Label>
          <Input value={finalPreview.toFixed(2)} disabled />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Free preview pages (home & unlock)</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={form.freePreviewPages}
            onChange={(e) => setForm({ ...form, freePreviewPages: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>
      <Button disabled={loading}>{loading ? "Saving..." : mode === "create" ? "Create Note" : "Update Note"}</Button>
    </form>
  );
}
