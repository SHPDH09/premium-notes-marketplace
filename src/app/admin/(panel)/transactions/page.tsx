"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await res.json();
    setItems(data.transactions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="flex gap-2">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Txn ID</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Coupon</th>
                <th className="px-3 py-2 text-left">Final</th>
                <th className="px-3 py-2 text-left">Payment</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.orderId} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{t.transactionId}</td>
                  <td className="px-3 py-2">{t.studentName}</td>
                  <td className="px-3 py-2">{t.noteName}</td>
                  <td className="px-3 py-2">{t.coupon ?? "-"}</td>
                  <td className="px-3 py-2">{formatCurrency(t.finalAmount)}</td>
                  <td className="px-3 py-2">{t.paymentStatus}</td>
                  <td className="px-3 py-2">{new Date(t.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
