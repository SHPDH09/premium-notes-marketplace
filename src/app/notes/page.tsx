"use client";

import { useEffect, useState } from "react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { NoteCard, PublicNote } from "@/components/notes/note-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotesPage() {
  const [notes, setNotes] = useState<PublicNote[]>([]);
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
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data.notes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">Browse Notes</h1>
        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
          <Input placeholder="Search notes..." value={q} onChange={(e) => setQ(e.target.value)} />
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
          <Button onClick={load}>Apply Filters</Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)
            : notes.map((note) => <NoteCard key={note.id} note={note} />)}
        </div>
        {!loading && notes.length === 0 && (
          <p className="mt-10 text-center text-slate-500">No notes found.</p>
        )}
      </div>
    </div>
  );
}
