"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function access(noteId: string, download = false) {
    const res = await fetch(`/api/purchases/${noteId}/access`);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Access denied");
    if (download && data.type === "pdf") {
      const a = document.createElement("a");
      a.href = data.url;
      a.download = "notes.pdf";
      a.click();
    } else {
      window.open(data.url, "_blank");
    }
  }

  return (
    <StudentShell>
      <h1 className="mb-6 text-2xl font-bold">My Purchased Notes</h1>
      {loading ? (
        <BrandLoading fullPage message="Loading purchases…" />
      ) : (
      <div className="grid gap-4 sm:grid-cols-2">
        {purchases.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-4 p-5">
              <div className="relative h-40 overflow-hidden rounded-xl bg-slate-100">
                {p.note.coverImage && (
                  <Image src={p.note.coverImage} alt={p.note.title} fill className="object-cover" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{p.note.title}</h3>
                <p className="text-sm text-slate-500">
                  Purchased {new Date(p.purchasedAt).toLocaleDateString()} · {formatCurrency(p.purchasedPrice)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => access(p.note.id)}>
                  Open / View Notes
                </Button>
                {p.note.hasPdf && (
                  <Button size="sm" variant="outline" onClick={() => access(p.note.id, true)}>
                    Download PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!purchases.length && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-slate-500">No purchases yet.</CardContent>
          </Card>
        )}
      </div>
      )}
    </StudentShell>
  );
}
