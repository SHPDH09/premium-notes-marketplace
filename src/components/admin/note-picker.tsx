"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, Search } from "lucide-react";

export type NoteOption = {
  id: string;
  title: string;
};

type NotePickerProps = {
  notes: NoteOption[];
  value: string[];
  onChange: (noteIds: string[]) => void;
  placeholder?: string;
};

export function NotePicker({
  notes,
  value,
  onChange,
  placeholder = "Search notes…",
}: NotePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedNotes = useMemo(
    () => value.map((id) => notes.find((n) => n.id === id)).filter(Boolean) as NoteOption[],
    [value, notes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (selectedSet.has(n.id)) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q);
    });
  }, [notes, query, selectedSet]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addNote(id: string) {
    onChange([...value, id]);
    setQuery("");
  }

  function removeNote(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 pr-10"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              addNote(filtered[0].id);
            }
          }}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Toggle note list"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {notes.length === value.length ? "All notes already selected" : "No matching notes"}
            </li>
          ) : (
            filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-900"
                  onClick={() => {
                    addNote(n.id);
                    setOpen(true);
                  }}
                >
                  {n.title}
                </button>
              </li>
            ))
          )}
        </ul>
        ) : null}
      </div>

      <div className="flex min-h-[2rem] flex-wrap items-center gap-2 pt-1">
        {selectedNotes.length === 0 ? (
          <span className="text-sm text-slate-500">All notes (none selected)</span>
        ) : (
          selectedNotes.map((n) => (
            <Badge key={n.id} className="gap-1 pr-1 font-normal">
              {n.title}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-slate-300/50"
                aria-label={`Remove ${n.title}`}
                onClick={() => removeNote(n.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
        {value.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
            Clear — apply to all notes
          </Button>
        ) : null}
      </div>
    </div>
  );
}
