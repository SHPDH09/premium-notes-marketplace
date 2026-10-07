"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function EditPhysicalDocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    void fetch(`/api/admin/physical-documents/${id}`)
      .then((r) => r.json())
      .then((d) => setForm(d.document));
  }, [id]);

  async function save() {
    const res = await fetch(`/api/admin/physical-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast.error("Save failed");
    toast.success("Saved");
  }

  async function sourcePdf() {
    const res = await fetch(`/api/admin/physical-documents/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast.error(data.error ?? "Unavailable");
  }

  if (!form) return <p>Loading…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Edit document</h1>
      <div>
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <Button variant="outline" onClick={() => void sourcePdf()}>
        Open source PDF (admin)
      </Button>
      <Button onClick={() => void save()}>Save</Button>
    </div>
  );
}
