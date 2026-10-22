"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CrmAgentsPage() {
  const [agents, setAgents] = useState<{ id: string; user: { name: string; email: string }; memberRole: string }[]>(
    []
  );
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function load() {
    const res = await fetch("/api/crm/agents", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setAgents(data.agents ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/crm/agents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success("Agent created");
    setForm({ name: "", email: "", password: "" });
    void load();
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">Agents</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/crm/calls">Calls workspace</Link>
        </Button>
      </div>
      <form onSubmit={addAgent} className="mt-4 grid max-w-lg gap-2">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-900" />
        <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-900" />
        <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-slate-900" />
        <Button type="submit">Add agent</Button>
      </form>
      <ul className="mt-6 space-y-2">
        {agents.map((a) => (
          <li key={a.id} className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
            {a.user.name} · {a.user.email} · {a.memberRole}
          </li>
        ))}
      </ul>
    </div>
  );
}
