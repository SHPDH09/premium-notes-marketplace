"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NoteForm } from "@/components/admin/note-form";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function EditNotePage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/admin/notes/${id}`)
      .then((r) => r.json())
      .then((d) => setNote(d.note));
  }, [id]);

  if (!note) return <BrandLoading fullPage message="Loading note…" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Notes</h1>
      <NoteForm mode="edit" noteId={id} initial={note} />
    </div>
  );
}
