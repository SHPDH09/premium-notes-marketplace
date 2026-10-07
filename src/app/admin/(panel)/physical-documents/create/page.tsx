"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CreatePhysicalDocumentPage() {
  const router = useRouter();
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

  async function submit() {
    const res = await fetch("/api/admin/physical-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
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
      {(
        [
          ["name", "Document name"],
          ["title", "Title"],
          ["coverStorageKey", "Cover storage key"],
          ["sourcePdfKey", "Source PDF key"],
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
        Upload cover/PDF via existing admin upload flow, then paste storage keys here.
      </p>
      <Button onClick={() => void submit()}>Create</Button>
    </div>
  );
}
