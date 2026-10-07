"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function AdminPhysicalOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const params = new URLSearchParams({ pageSize: "50" });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/physical-orders?${params}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Physical Orders</h1>
      <div className="flex gap-2">
        <Input placeholder="Order #, student, tracking…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Fulfillment</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-3 py-2">{o.studentName}</td>
                  <td className="px-3 py-2">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-3 py-2">{o.paymentStatus}</td>
                  <td className="px-3 py-2">{o.fulfillmentLabel}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/physical-orders/${o.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
