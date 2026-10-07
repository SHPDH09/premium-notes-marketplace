"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/physical/status-badge";
import { Button } from "@/components/ui/button";

export default function PhysicalOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    void fetch("/api/physical-orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, []);

  return (
    <StudentShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Physical Orders</h1>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              You haven&apos;t placed any physical document orders yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-indigo-700">{o.orderNumber}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(o.createdAt).toLocaleString()} · {o.items[0]?.documentTitle}
                      {o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <PaymentStatusBadge status={o.paymentStatus} />
                      <FulfillmentStatusBadge label={o.fulfillmentLabel} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(o.totalAmount)}</p>
                    {o.trackingNumber && (
                      <p className="text-xs text-slate-500">Tracking: {o.trackingNumber}</p>
                    )}
                    <Button asChild size="sm" className="mt-2">
                      <Link href={`/physical-orders/${o.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
