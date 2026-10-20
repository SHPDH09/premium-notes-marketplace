"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  priceAmount: number;
  priceLabel?: string | null;
  durationDays?: number | null;
  status: string;
  sortOrder: number;
};

export default function AdminPlacementSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    priceAmount: "",
    priceLabel: "",
    durationDays: "",
    sortOrder: "0",
  });
  const [grant, setGrant] = useState({ userId: "", planId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    priceAmount: "",
    priceLabel: "",
    durationDays: "",
    sortOrder: "0",
  });

  async function load() {
    const [p, s, u] = await Promise.all([
      fetch("/api/admin/placement/plans", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/placement/subscriptions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/users", { credentials: "include" }).then((r) => r.json()),
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
        priceAmount: parseFloat(planForm.priceAmount) || 0,
        priceLabel: planForm.priceLabel || null,
        durationDays: planForm.durationDays ? parseInt(planForm.durationDays, 10) : null,
        sortOrder: parseInt(planForm.sortOrder, 10) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Plan created");
    setPlanForm({
      name: "",
      description: "",
      priceAmount: "",
      priceLabel: "",
      durationDays: "",
      sortOrder: "0",
    });
    load();
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditForm({
      name: plan.name,
      description: plan.description ?? "",
      priceAmount: String(plan.priceAmount ?? 0),
      priceLabel: plan.priceLabel ?? "",
      durationDays: plan.durationDays != null ? String(plan.durationDays) : "",
      sortOrder: String(plan.sortOrder ?? 0),
    });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/placement/plans/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        priceAmount: parseFloat(editForm.priceAmount) || 0,
        priceLabel: editForm.priceLabel || null,
        durationDays: editForm.durationDays ? parseInt(editForm.durationDays, 10) : null,
        sortOrder: parseInt(editForm.sortOrder, 10) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Update failed");
    toast.success("Plan updated");
    setEditingId(null);
    load();
  }

  async function toggleStatus(plan: Plan) {
    const res = await fetch(`/api/admin/placement/plans/${plan.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: plan.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    if (!res.ok) return toast.error("Could not update status");
    load();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    const res = await fetch(`/api/admin/placement/plans/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Delete failed");
    toast.success("Plan deleted");
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
        <p className="text-slate-500">Manage plans, pricing (Cashfree), and student access.</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">All plans ({plans.length})</h2>
        {!plans.length ? (
          <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">No plans yet. Create one below.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  {editingId === plan.id ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Plan name"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.priceAmount}
                        onChange={(e) => setEditForm({ ...editForm, priceAmount: e.target.value })}
                        placeholder="Price INR"
                      />
                      <Input
                        value={editForm.priceLabel}
                        onChange={(e) => setEditForm({ ...editForm, priceLabel: e.target.value })}
                        placeholder="Price label"
                      />
                      <Input
                        value={editForm.durationDays}
                        onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })}
                        placeholder="Duration days"
                      />
                      <Textarea
                        className="md:col-span-2"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Description"
                      />
                      <div className="flex gap-2 md:col-span-2">
                        <Button type="button" onClick={() => void saveEdit(plan.id)}>
                          Save
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {plan.name}{" "}
                          <span
                            className={
                              plan.status === "ACTIVE"
                                ? "text-xs font-medium text-emerald-600"
                                : "text-xs font-medium text-slate-400"
                            }
                          >
                            {plan.status === "ACTIVE" ? "Enabled" : "Disabled"}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatCurrency(plan.priceAmount)} · {plan.priceLabel ?? "—"} ·{" "}
                          {plan.durationDays ? `${plan.durationDays} days` : "Lifetime"}
                        </p>
                        {plan.description ? (
                          <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleStatus(plan)}>
                          {plan.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deletePlan(plan.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={createPlan} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Create plan</h2>
        <div>
          <Label>Plan name</Label>
          <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
        </div>
        <div>
          <Label>Price (INR — charged via Cashfree)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={planForm.priceAmount}
            onChange={(e) => setPlanForm({ ...planForm, priceAmount: e.target.value })}
            placeholder="999"
          />
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
        <h2 className="md:col-span-2 text-lg font-semibold">Grant subscription (manual)</h2>
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
            {plans.filter((p) => p.status === "ACTIVE").map((p) => (
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
        {!subs.length ? (
          <p className="text-sm text-slate-500">No subscriptions yet.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
