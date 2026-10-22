"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<object[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  async function load() {
    const res = await fetch("/api/super-admin/companies", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setCompanies(data.companies ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/super-admin/companies", {
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
    toast.success("Company created");
    setForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
    void load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Companies</h1>
      <form onSubmit={createCompany} className="mt-4 grid max-w-lg gap-2">
        <Input placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-900" />
        <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-slate-900" />
        <Input placeholder="Admin name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="bg-slate-900" />
        <Input placeholder="Admin email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="bg-slate-900" />
        <Input placeholder="Admin password" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="bg-slate-900" />
        <Button type="submit">Create company</Button>
      </form>
      <pre className="mt-6 overflow-auto rounded bg-slate-900 p-4 text-xs text-slate-400">
        {JSON.stringify(companies, null, 2)}
      </pre>
    </div>
  );
}
