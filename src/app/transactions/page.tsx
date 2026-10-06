"use client";

import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function TransactionsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/student/transactions")
      .then((r) => r.json())
      .then((d) => setItems(d.transactions ?? []));
  }, []);

  return (
    <StudentShell>
      <h1 className="mb-6 text-2xl font-bold">My Transactions</h1>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Coupon</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.orderId} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{t.transactionId}</td>
                  <td className="px-4 py-3">{t.note}</td>
                  <td className="px-4 py-3">{t.coupon ?? "-"}</td>
                  <td className="px-4 py-3">{formatCurrency(t.finalAmount)}</td>
                  <td className="px-4 py-3">{t.paymentStatus}</td>
                  <td className="px-4 py-3">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="p-8 text-center text-slate-500">No transactions yet.</p>}
        </CardContent>
      </Card>
    </StudentShell>
  );
}
