"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export default function CrmContactsPage() {
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string | null; phone: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/crm/contacts${params}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setContacts(data.contacts ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Contacts</h1>
      <Input
        className="mt-4 max-w-md border-slate-700 bg-slate-900"
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="mt-4 space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
            <span className="font-medium text-white">{c.name || "—"}</span>
            <span className="ml-2 text-slate-400">{c.phone}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
