"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NotePicker } from "@/components/admin/note-picker";
import { toast } from "sonner";

export default function CreatePhysicalDocumentPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [sourceNoteId, setSourceNoteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    printingCost: 0,
    bindingCost: 0,
    packagingCost: 0,
    basePrice: 0,
    pageCount: 100,
    coverStorageKey: "",
    sourcePdfKey: "",
  });

  useEffect(() => {
    void fetch("/api/admin/notes")
      .then((r) => r.json())
      .then((d) => setNotes((d.notes ?? []).map((n: { id: string; title: string }) => ({ id: n.id, title: n.title }))));
  }, []);

  function applyNote(noteId: string) {
    setSourceNoteId(noteId);
    const note = notes.find((n) => n.id === noteId);
    void fetch("/api/admin/notes")
      .then((r) => r.json())
      .then((d) => {
        const full = (d.notes ?? []).find((n: { id: string }) => n.id === noteId);
        if (!full) return;
        setForm((f) => ({
          ...f,
          name: full.name ?? full.title ?? note?.title ?? "",
          title: full.title ?? "",
          description: full.description ?? "",
          pageCount: full.pdfPageCount ?? f.pageCount,
        }));
      });
  }

  async function submit() {
    const res = await fetch("/api/admin/physical-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sourceNoteId,
        coverStorageKey: form.coverStorageKey || null,
        sourcePdfKey: form.sourcePdfKey || null,
        description: form.description || "Physical document",
        minQuantity: 1,
        maxQuantity: 10,
        status: "ACTIVE",
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Created");
    router.push("/admin/physical-documents");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Add physical document</h1>
      <div>
        <Label>Link to existing note (same title, cover, description as Browse Notes)</Label>
        <div className="mt-2">
          <NotePicker
            notes={notes}
            value={sourceNoteId ? [sourceNoteId] : []}
            onChange={(ids) => {
              const id = ids[0];
              if (id) applyNote(id);
              else setSourceNoteId(null);
            }}
            placeholder="Pick a note…"
          />
        </div>
      </div>
      {(
        [
          ["name", "Document name"],
          ["title", "Title"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          <Input
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      {(
        [
          ["printingCost", "Printing cost"],
          ["bindingCost", "Binding cost"],
          ["packagingCost", "Packaging cost"],
          ["basePrice", "Base price"],
          ["pageCount", "Page count"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Cover and PDF are copied from the linked note automatically on save when keys are left empty.
      </p>
      <Button onClick={() => void submit()}>Create</Button>
    </div>
  );
}
