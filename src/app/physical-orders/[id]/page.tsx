"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PaymentStatusBadge, FulfillmentStatusBadge } from "@/components/physical/status-badge";
import { PhysicalOrderJourney } from "@/components/physical/order-journey";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function PhysicalOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);

  async function load() {
    const res = await fetch(`/api/physical-orders/${id}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setOrder(data.order);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function cancel() {
    const res = await fetch(`/api/physical-orders/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: "Changed mind" }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Cannot cancel");
    toast.success("Order cancelled");
    load();
  }

  if (!order) {
    return (
      <StudentShell>
        <BrandLoading fullPage message="Loading order…" />
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              <PaymentStatusBadge status={order.paymentStatus} />
              <FulfillmentStatusBadge label={order.fulfillmentLabel} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/physical-orders/${id}/invoice`} target="_blank">
                Official bill / invoice
              </Link>
            </Button>
            {order.trackingUrl && (
              <Button asChild>
                <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                  Track shipment
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Order status & history</CardTitle>
            </CardHeader>
            <CardContent>
              <PhysicalOrderJourney
                fulfillmentStatus={order.fulfillmentStatus}
                history={order.history}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              {order.address ? (
                <>
                  <p className="font-medium text-slate-900">{order.address.fullName}</p>
                  <p>{order.address.addressLine1}</p>
                  {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
                  <p>
                    {order.address.city}, {order.address.state} {order.address.pincode}
                  </p>
                  <p>{order.address.country}</p>
                </>
              ) : (
                <p>No address on file.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items & pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.items.map((i: any) => (
              <div key={i.id} className="flex justify-between border-b pb-2">
                <span>
                  {i.documentTitle} × {i.quantity}
                </span>
                <span>{formatCurrency(i.totalPrice)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <span>Delivery</span>
              <span>{formatCurrency(order.deliveryCharge)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {["ORDER_PLACED", "PAYMENT_CONFIRMED", "PROCESSING"].includes(order.fulfillmentStatus) &&
          order.paymentStatus !== "SUCCESS" && (
            <Button variant="outline" onClick={() => void cancel()}>
              Cancel order
            </Button>
          )}
      </div>
    </StudentShell>
  );
}
