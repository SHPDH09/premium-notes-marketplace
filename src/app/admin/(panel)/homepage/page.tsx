"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminHomepagePage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    displayName: "",
    institute: "",
    headline: "Featured Student",
    quote: "",
    sortOrder: "0",
    status: "ACTIVE",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/spotlights");
    const data = await res.json();
    setItems(data.spotlights ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append("photo", photo);
    const res = await fetch("/api/admin/spotlights", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Spotlight added to homepage");
    setForm({
      displayName: "",
      institute: "",
      headline: "Featured Student",
      quote: "",
      sortOrder: "0",
      status: "ACTIVE",
    });
    setPhoto(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove from homepage?")) return;
    await fetch(`/api/admin/spotlights/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Homepage — Student Spotlight</h1>
        <p className="text-slate-500">
          Add featured students (e.g. Testmile) to display on the public home page. You can also enable this when
          creating a student under Students.
        </p>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Display name</Label>
          <Input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Testmile"
            required
          />
        </div>
        <div>
          <Label>Institute / College</Label>
          <Input
            value={form.institute}
            onChange={(e) => setForm({ ...form, institute: e.target.value })}
            placeholder="Testmile Institute"
          />
        </div>
        <div>
          <Label>Headline</Label>
          <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div>
          <Label>Photo</Label>
          <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </div>
        <div className="md:col-span-2">
          <Label>Quote</Label>
          <Textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </div>
        <Button type="submit">Show on Homepage</Button>
      </form>

      <Card>
        <CardContent className="space-y-4 p-6">
          {items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                  {s.photo ? (
                    <Image src={s.photo} alt="" fill className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center font-bold text-indigo-600">
                      {s.displayName[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{s.displayName}</p>
                  <p className="text-sm text-slate-500">{s.institute ?? s.studentEmail ?? "—"}</p>
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>
                Remove
              </Button>
            </div>
          ))}
          {!items.length && <p className="text-center text-slate-500">No homepage spotlights yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
