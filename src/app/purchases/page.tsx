"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openViewer(noteId: string) {
    router.push(`/purchases/${noteId}/view`);
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
              <Button size="sm" onClick={() => openViewer(p.note.id)}>
                Open protected viewer
              </Button>
              <p className="text-xs text-slate-500">
                View-only in your dashboard. Download and sharing are disabled.
              </p>
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
