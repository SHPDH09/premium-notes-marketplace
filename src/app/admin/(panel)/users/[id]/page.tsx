"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [resetPwd, setResetPwd] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/users/${id}`, { credentials: "include", cache: "no-store" });
    setData(await res.json());
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!data?.user) return <BrandLoading fullPage message="Loading user…" />;

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        status: data.user.status,
      }),
    });
    toast.success("Student updated");
    load();
  }

  async function resetPassword() {
    await fetch(`/api/admin/users/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPwd }),
    });
    toast.success("Password reset");
    setResetPwd("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data.user.name}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateUser} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={data.user.name}
                  onChange={(e) => setData({ ...data, user: { ...data.user, name: e.target.value } })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={data.user.email}
                  onChange={(e) => setData({ ...data, user: { ...data.user, email: e.target.value } })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={data.user.phone ?? ""}
                  onChange={(e) => setData({ ...data, user: { ...data.user, phone: e.target.value } })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="h-11 w-full rounded-xl border px-3 text-sm"
                  value={data.user.status}
                  onChange={(e) => setData({ ...data, user: { ...data.user, status: e.target.value } })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
              <Button type="submit">Update Student</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" placeholder="New password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
            <Button onClick={resetPassword}>Reset Password</Button>
            <p className="text-sm text-slate-500">Notes spent: {formatCurrency(data.totalSpent)}</p>
            <p className="text-sm text-slate-500">Placement spent: {formatCurrency(data.totalPlacementSpent ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Purchased Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.purchases?.length ? (
              data.purchases.map((p: any) => (
                <div key={p.id} className="flex justify-between border-b py-2">
                  <span>{p.note.title}</span>
                  <span>{formatCurrency(p.purchasedPrice)}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No note purchases yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement subscriptions & payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-medium text-slate-700">Subscription history</p>
              {data.placementSubscriptions?.length ? (
                <ul className="space-y-2">
                  {data.placementSubscriptions.map((s: any) => (
                    <li key={s.id} className="rounded-lg border px-3 py-2">
                      <div className="font-medium">{s.planName}</div>
                      <div className="text-xs text-slate-500">
                        {s.status} · {new Date(s.startsAt).toLocaleDateString()}
                        {s.endsAt ? ` → ${new Date(s.endsAt).toLocaleDateString()}` : " · no end date"}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">No placement subscriptions.</p>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium text-slate-700">Payment history</p>
              {data.placementPayments?.length ? (
                <ul className="space-y-2">
                  {data.placementPayments.map((p: any) => (
                    <li key={p.id} className="flex justify-between rounded-lg border px-3 py-2">
                      <span>{p.planName}</span>
                      <span className="text-right">
                        {formatCurrency(p.amount)}
                        <span className="block text-xs text-slate-500">{p.paymentStatus}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">No placement payments.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All payments (notes + placement)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Txn ID</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentHistory?.map((row: any) => (
                <tr key={`${row.kind}-${row.id}`} className="border-t">
                  <td className="px-3 py-2">{row.kind === "PLACEMENT" ? "Placement" : "Notes"}</td>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2">{row.paymentStatus}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.transactionId ?? "—"}</td>
                  <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.paymentHistory?.length && <p className="text-slate-500">No payments recorded.</p>}
          <p className="mt-3 text-xs text-slate-500">
            Full admin ledger:{" "}
            <Link href="/admin/transactions" className="text-indigo-600 hover:underline">
              Transactions
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
