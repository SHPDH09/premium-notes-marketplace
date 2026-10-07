"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, Search } from "lucide-react";

export type PhysicalDocOption = { id: string; title: string };

type Props = {
  documents: PhysicalDocOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
};

export function PhysicalDocumentPicker({
  documents,
  value,
  onChange,
  placeholder = "Search physical documents…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const selected = useMemo(
    () => value.map((id) => documents.find((d) => d.id === id)).filter(Boolean) as PhysicalDocOption[],
    [value, documents]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (selectedSet.has(d.id)) return false;
      if (!q) return true;
      return d.title.toLowerCase().includes(q);
    });
  }, [documents, query, selectedSet]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        {selected.map((d) => (
          <Badge key={d.id} variant="default" className="gap-1 pr-1">
            {d.title}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== d.id))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <div className="relative flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0"
            placeholder={selected.length ? "Add more…" : placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white py-1 shadow-lg">
          {filtered.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange([...value, d.id]);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {d.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
