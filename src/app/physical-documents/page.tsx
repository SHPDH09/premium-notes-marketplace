"use client";

import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLoading } from "@/components/brand/brand-loading";
import { HorizontalScrollRow } from "@/components/ui/horizontal-marquee";
import {
  PhysicalDocumentCard,
  PublicPhysicalDocument,
} from "@/components/physical/physical-document-card";

export default function PhysicalDocumentsPage() {
  const [docs, setDocs] = useState<PublicPhysicalDocument[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (q) params.set("q", q);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    const res = await fetch(`/api/physical-documents?${params}`);
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StudentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Physical Documents</h1>
          <p className="mt-1 text-slate-600">
            Same notes you browse digitally — order premium printed copies with delivery.
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="Min price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <Input placeholder="Max price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <select
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Popular</option>
          </select>
          <Button onClick={() => void load()}>Apply Filters</Button>
        </div>

        <HorizontalScrollRow className="px-1">
          {loading ? (
            <div className="min-w-full py-8">
              <BrandLoading fullPage size="lg" message="Loading documents…" />
            </div>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="min-w-[280px] max-w-[320px] shrink-0 snap-start">
                <PhysicalDocumentCard
                  doc={doc}
                  quantity={qty[doc.id] ?? doc.minQuantity}
                  onQuantityChange={(n) => setQty((s) => ({ ...s, [doc.id]: n }))}
                />
              </div>
            ))
          )}
        </HorizontalScrollRow>

        {!loading && docs.length === 0 && (
          <p className="py-10 text-center text-slate-500">No physical documents available.</p>
        )}
      </div>
    </StudentShell>
  );
}
