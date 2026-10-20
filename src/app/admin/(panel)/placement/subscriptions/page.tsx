"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function AdminPlacementSubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    priceLabel: "",
    durationDays: "",
    sortOrder: "0",
  });
  const [grant, setGrant] = useState({ userId: "", planId: "" });

  async function load() {
    const [p, s, u] = await Promise.all([
      fetch("/api/admin/placement/plans", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/placement/subscriptions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/users?limit=200", { credentials: "include" }).then((r) => r.json()),
    ]);
    setPlans(p.plans ?? []);
    setSubs(s.subscriptions ?? []);
    setStudents(u.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/placement/plans", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planForm.name,
        description: planForm.description || null,
        priceLabel: planForm.priceLabel || null,
        durationDays: planForm.durationDays ? parseInt(planForm.durationDays, 10) : null,
        sortOrder: parseInt(planForm.sortOrder, 10) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Plan created");
    setPlanForm({ name: "", description: "", priceLabel: "", durationDays: "", sortOrder: "0" });
    load();
  }

  async function grantSubscription(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/placement/subscriptions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: grant.userId, planId: grant.planId }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Subscription granted");
    setGrant({ userId: "", planId: "" });
    load();
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/placement/subscriptions/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    load();
  }

  if (loading) return <BrandLoading fullPage message="Loading…" />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Placement — Subscriptions</h1>
        <p className="text-slate-500">Plans and student access to job listings.</p>
      </div>

      <form onSubmit={createPlan} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Create plan</h2>
        <div>
          <Label>Plan name</Label>
          <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
        </div>
        <div>
          <Label>Price label (display)</Label>
          <Input
            value={planForm.priceLabel}
            onChange={(e) => setPlanForm({ ...planForm, priceLabel: e.target.value })}
            placeholder="₹999 / year"
          />
        </div>
        <div>
          <Label>Duration (days, empty = lifetime)</Label>
          <Input
            value={planForm.durationDays}
            onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={planForm.description}
            onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
          />
        </div>
        <Button type="submit">Save plan</Button>
      </form>

      <form onSubmit={grantSubscription} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Grant subscription</h2>
        <div>
          <Label>Student</Label>
          <select
            className="flex h-10 w-full rounded-md border px-3 text-sm"
            value={grant.userId}
            onChange={(e) => setGrant({ ...grant, userId: e.target.value })}
            required
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Plan</Label>
          <select
            className="flex h-10 w-full rounded-md border px-3 text-sm"
            value={grant.planId}
            onChange={(e) => setGrant({ ...grant, planId: e.target.value })}
            required
          >
            <option value="">Select plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Grant access</Button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Active & recent subscriptions</h2>
        <div className="space-y-2">
          {subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span>
                  {s.userName} — {s.planName} ({s.status})
                </span>
                {s.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" onClick={() => void revoke(s.id)}>
                    Revoke
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
