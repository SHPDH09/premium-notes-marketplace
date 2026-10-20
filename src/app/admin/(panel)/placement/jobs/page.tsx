"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

const APPLY_TYPES = ["EMAIL", "LINK", "WALK_IN", "CALL", "WHATSAPP"] as const;

export default function AdminPlacementJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    applyType: "EMAIL" as (typeof APPLY_TYPES)[number],
    description: "",
    applyEmail: "",
    applyUrl: "",
    applyPhone: "",
    walkInDetails: "",
    sortOrder: "0",
  });

  async function load() {
    const res = await fetch("/api/admin/placement/jobs", { credentials: "include" });
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/placement/jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        company: form.company,
        location: form.location || null,
        applyType: form.applyType,
        description: form.description,
        applyEmail: form.applyEmail || null,
        applyUrl: form.applyUrl || null,
        applyPhone: form.applyPhone || null,
        walkInDetails: form.walkInDetails || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Job posted");
    setForm({
      title: "",
      company: "",
      location: "",
      applyType: "EMAIL",
      description: "",
      applyEmail: "",
      applyUrl: "",
      applyPhone: "",
      walkInDetails: "",
      sortOrder: "0",
    });
    load();
  }

  async function toggleStatus(job: any) {
    await fetch(`/api/admin/placement/jobs/${job.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: job.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete job?")) return;
    await fetch(`/api/admin/placement/jobs/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  if (loading) return <BrandLoading fullPage message="Loading jobs…" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Placement — Job postings</h1>
        <p className="text-slate-500">Email, link, walk-in, call, or WhatsApp jobs for subscribed students.</p>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Job title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <Label>Apply type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.applyType}
            onChange={(e) => setForm({ ...form, applyType: e.target.value as typeof form.applyType })}
          >
            {APPLY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        {form.applyType === "EMAIL" ? (
          <div>
            <Label>Apply email</Label>
            <Input
              type="email"
              value={form.applyEmail}
              onChange={(e) => setForm({ ...form, applyEmail: e.target.value })}
              required
            />
          </div>
        ) : null}
        {form.applyType === "LINK" ? (
          <div>
            <Label>Apply URL</Label>
            <Input
              type="url"
              value={form.applyUrl}
              onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
              required
            />
          </div>
        ) : null}
        {form.applyType === "WALK_IN" ? (
          <div className="md:col-span-2">
            <Label>Walk-in details</Label>
            <Textarea
              rows={3}
              value={form.walkInDetails}
              onChange={(e) => setForm({ ...form, walkInDetails: e.target.value })}
              required
            />
          </div>
        ) : null}
        {form.applyType === "CALL" || form.applyType === "WHATSAPP" ? (
          <div>
            <Label>{form.applyType === "WHATSAPP" ? "WhatsApp number" : "Phone number"}</Label>
            <Input
              type="tel"
              placeholder="+91 9876543210"
              value={form.applyPhone}
              onChange={(e) => setForm({ ...form, applyPhone: e.target.value })}
              required
            />
          </div>
        ) : null}
        <div>
          <Label>Sort order</Label>
          <Input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <div className="flex items-end md:col-span-2">
          <Button type="submit">Publish job</Button>
        </div>
      </form>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {job.title} · {job.company}
                </p>
                <p className="text-xs text-indigo-600">{job.applyType}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.description}</p>
                <p className="mt-1 text-xs text-slate-400">Status: {job.status}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void toggleStatus(job)}>
                  {job.status === "ACTIVE" ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void remove(job.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
