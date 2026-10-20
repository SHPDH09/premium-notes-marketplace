"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhysicalPagePricingFields } from "@/components/admin/physical-page-pricing";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

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
      body: JSON.stringify({
        sourceNoteId: form.sourceNoteId,
        name: form.name ?? form.title,
        title: form.title,
        description: form.description,
        pageCount: form.pageCount,
        printingCost: form.printingCost,
        bindingCost: form.bindingCost,
        packagingCost: form.packagingCost,
        basePrice: form.basePrice,
        paperSize: form.paperSize,
        paperType: form.paperType,
        printType: form.printType,
        bindingType: form.bindingType,
        minQuantity: form.minQuantity,
        maxQuantity: form.maxQuantity,
        processingDays: form.processingDays,
        status: form.status,
        priceOverride: form.priceOverride,
      }),
    });
    if (!res.ok) return toast.error("Save failed");
    toast.success("Saved");
    const data = await res.json();
    setForm(data.document);
  }

  async function sourcePdf() {
    const res = await fetch(`/api/admin/physical-documents/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast.error(data.error ?? "Unavailable");
  }

  if (!form) return <BrandLoading fullPage message="Loading document…" />;

  const noteTotalPages =
    form.sourceNotePageCount ?? form.linkedNote?.pdfPageCount ?? null;

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

      <PhysicalPagePricingFields
        noteTotalPages={noteTotalPages}
        value={{
          pageCount: form.pageCount ?? 1,
          printingCost: form.printingCost ?? 0,
          bindingCost: form.bindingCost ?? 0,
          packagingCost: form.packagingCost ?? 0,
          basePrice: form.basePrice ?? 0,
        }}
        onChange={(next) =>
          setForm({
            ...form,
            pageCount: next.pageCount,
            printingCost: next.printingCost,
            bindingCost: next.bindingCost,
            packagingCost: next.packagingCost,
            basePrice: next.basePrice,
          })
        }
      />

      <Button variant="outline" onClick={() => void sourcePdf()}>
        Open source PDF (admin)
      </Button>
      <Button onClick={() => void save()}>Save</Button>
    </div>
  );
}
