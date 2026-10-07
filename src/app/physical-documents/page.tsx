"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";

export default function PhysicalDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/physical-documents")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []));
  }, []);

  async function addToCart(id: string, buyNow = false) {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/physical-documents")}`);
      return;
    }
    const quantity = qty[id] ?? 1;
    const res = await fetch("/api/physical-cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ physicalDocumentId: id, quantity }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Could not add");
    toast.success("Added to cart");
    if (buyNow) router.push("/physical-cart");
  }

  return (
    <StudentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Physical Documents</h1>
          <p className="text-slate-600">Order printed copies delivered to your address.</p>
        </div>
        {docs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              No physical documents available.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                {doc.coverImage && (
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image src={doc.coverImage} alt="" fill className="object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  <p className="text-sm text-slate-500">{doc.name}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="line-clamp-3 text-slate-600">{doc.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {doc.pageCount && <span>{doc.pageCount} pages</span>}
                    <span>{doc.paperType.replace("_", " ")}</span>
                    <span>{doc.printType.replace("_", " & ")}</span>
                  </div>
                  <p className="text-lg font-semibold text-indigo-700">
                    {formatCurrency(doc.finalPrice)} <span className="text-sm font-normal">/ copy</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Qty</label>
                    <Input
                      type="number"
                      min={doc.minQuantity}
                      max={doc.maxQuantity}
                      className="h-9 w-20"
                      value={qty[doc.id] ?? doc.minQuantity}
                      onChange={(e) =>
                        setQty((s) => ({ ...s, [doc.id]: parseInt(e.target.value, 10) || 1 }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => void addToCart(doc.id)}>
                      Add to Cart
                    </Button>
                    <Button variant="outline" onClick={() => void addToCart(doc.id, true)}>
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
