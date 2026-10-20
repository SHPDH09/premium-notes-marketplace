"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Placed = {
  id: string;
  displayName: string;
  company: string;
  role?: string | null;
  packageLabel?: string | null;
  photo?: string | null;
};

export function PlacedStudentsStrip({ title = "Placed students" }: { title?: string }) {
  const [items, setItems] = useState<Placed[]>([]);

  useEffect(() => {
    fetch("/api/placement/placed-students")
      .then((r) => r.json())
      .then((d) => setItems(d.placedStudents ?? []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Success stories from our placement program</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="min-w-[140px] shrink-0 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-center"
          >
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow">
              {s.photo ? (
                <Image src={s.photo} alt={s.displayName} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="flex h-full items-center justify-center text-lg font-bold text-indigo-600">
                  {s.displayName.charAt(0)}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{s.displayName}</p>
            <p className="text-xs text-slate-600">{s.company}</p>
            {s.packageLabel ? (
              <p className="mt-1 text-xs font-medium text-emerald-700">{s.packageLabel}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
