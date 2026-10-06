"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NoteForm } from "@/components/admin/note-form";

export default function EditNotePage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/admin/notes/${id}`)
      .then((r) => r.json())
      .then((d) => setNote(d.note));
  }, [id]);

  if (!note) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Notes</h1>
      <NoteForm mode="edit" noteId={id} initial={note} />
    </div>
  );
}
