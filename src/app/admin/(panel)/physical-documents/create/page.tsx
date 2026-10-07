"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NotePicker } from "@/components/admin/note-picker";
import { PhysicalPagePricingFields } from "@/components/admin/physical-page-pricing";
import { toast } from "sonner";

export default function CreatePhysicalDocumentPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<{ id: string; title: string; pdfPageCount?: number | null }[]>(
    []
  );
  const [sourceNoteId, setSourceNoteId] = useState<string | null>(null);
  const [noteTotalPages, setNoteTotalPages] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    printingCost: 0,
    bindingCost: 0,
    packagingCost: 0,
    basePrice: 0,
    pageCount: 1,
  });

  useEffect(() => {
    void fetch("/api/admin/notes")
      .then((r) => r.json())
      .then((d) =>
        setNotes(
          (d.notes ?? []).map((n: { id: string; title: string; pdfPageCount?: number | null }) => ({
            id: n.id,
            title: n.title,
            pdfPageCount: n.pdfPageCount,
          }))
        )
      );
  }, []);

  function applyNote(noteId: string) {
    setSourceNoteId(noteId);
    void fetch("/api/admin/notes")
      .then((r) => r.json())
      .then((d) => {
        const full = (d.notes ?? []).find((n: { id: string }) => n.id === noteId);
        if (!full) return;
        const pages = full.pdfPageCount ?? null;
        setNoteTotalPages(pages);
        setForm((f) => ({
          ...f,
          name: full.name ?? full.title ?? "",
          title: full.title ?? "",
          description: full.description ?? "",
          pageCount: pages && pages > 0 ? pages : f.pageCount,
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
        <Label>Link to existing note</Label>
        <div className="mt-2">
          <NotePicker
            notes={notes.map((n) => ({
              id: n.id,
              title:
                n.pdfPageCount != null
                  ? `${n.title} (${n.pdfPageCount} pages)`
                  : n.title,
            }))}
            value={sourceNoteId ? [sourceNoteId] : []}
            onChange={(ids) => {
              const id = ids[0];
              if (id) applyNote(id);
              else {
                setSourceNoteId(null);
                setNoteTotalPages(null);
              }
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

      <PhysicalPagePricingFields
        noteTotalPages={noteTotalPages}
        value={form}
        onChange={(next) =>
          setForm((f) => ({
            ...f,
            pageCount: next.pageCount,
            printingCost: next.printingCost,
            bindingCost: next.bindingCost,
            packagingCost: next.packagingCost,
            basePrice: next.basePrice,
          }))
        }
      />

      <p className="text-xs text-slate-500">
        Cover and PDF are copied from the linked note on save when not set manually.
      </p>
      <Button onClick={() => void submit()}>Create</Button>
    </div>
  );
}
