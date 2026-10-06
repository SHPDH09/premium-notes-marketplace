"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-slate-500">Loading dashboard...</p>;

  const stats = [
    { label: "Total Students", value: data.stats.totalStudents },
    { label: "Total Notes", value: data.stats.totalNotes },
    { label: "Total Purchases", value: data.stats.totalPurchases },
    { label: "Total Revenue", value: formatCurrency(data.stats.totalRevenue) },
    { label: "Transactions", value: data.stats.totalTransactions },
    { label: "Active Coupons", value: data.stats.activeCoupons },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{s.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Notes</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topNotes}>
              <XAxis dataKey="title" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="purchaseCount" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentPurchases.map((p: any) => (
              <div key={p.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>
                  {p.student} · {p.note}
                </span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentStudents.map((s: any) => (
              <div key={s.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{s.name}</span>
                <span className="text-slate-500">{s.email}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
