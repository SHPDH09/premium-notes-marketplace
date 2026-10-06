"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [resetPwd, setResetPwd] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/users/${id}`);
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!data?.user) return <p>Loading...</p>;

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
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
            <p className="text-sm text-slate-500">Total spent: {formatCurrency(data.totalSpent)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Purchased Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.purchases?.map((p: any) => (
            <div key={p.id} className="flex justify-between border-b py-2">
              <span>{p.note.title}</span>
              <span>{formatCurrency(p.purchasedPrice)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
