import { NoteForm } from "@/components/admin/note-form";

export default function CreateNotePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Notes</h1>
      <NoteForm mode="create" />
    </div>
  );
}
