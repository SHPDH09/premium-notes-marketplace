"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PhysicalFulfillmentStatus } from "@prisma/client";

const actions: { label: string; status: PhysicalFulfillmentStatus }[] = [
  { label: "Start processing", status: "PROCESSING" },
  { label: "Start printing", status: "PRINTING" },
  { label: "Quality check", status: "QUALITY_CHECK" },
  { label: "Mark packed", status: "PACKED" },
  { label: "Mark shipped", status: "SHIPPED" },
  { label: "Out for delivery", status: "OUT_FOR_DELIVERY" },
  { label: "Delivered", status: "DELIVERED" },
];

export default function AdminPhysicalOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState({ courierName: "", trackingNumber: "", trackingUrl: "" });

  async function load() {
    const res = await fetch(`/api/admin/physical-orders/${id}`);
    const data = await res.json();
    setOrder(data.order);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function patch(body: unknown) {
    const res = await fetch(`/api/admin/physical-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Updated");
    setOrder(data.order);
  }

  if (!order) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-slate-500">{order.studentName} · {order.studentPhone}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/physical-orders/${id}/print`} target="_blank">
              Print order sheet
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/physical-orders/${id}/invoice`} target="_blank">
              Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant="outline"
              onClick={() => patch({ action: "fulfillment", status: a.status })}
            >
              {a.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Printing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => patch({ action: "print", status: "PRINTING" })}>
            Start print job
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch({ action: "print", status: "PRINTED" })}>
            Mark printed
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch({ action: "print", status: "QC_PASSED" })}>
            QC pass
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch({ action: "print", status: "QC_FAILED", qcReason: "Poor print quality" })}
          >
            QC fail
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch({ action: "pack", packageCount: 1 })}>
            Mark packed
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Courier"
            value={tracking.courierName}
            onChange={(e) => setTracking((t) => ({ ...t, courierName: e.target.value }))}
          />
          <Input
            placeholder="Tracking #"
            value={tracking.trackingNumber}
            onChange={(e) => setTracking((t) => ({ ...t, trackingNumber: e.target.value }))}
          />
          <Input
            placeholder="Tracking URL"
            value={tracking.trackingUrl}
            onChange={(e) => setTracking((t) => ({ ...t, trackingUrl: e.target.value }))}
          />
          <Button
            className="sm:col-span-3"
            onClick={() =>
              patch({
                action: "shipment",
                courierName: tracking.courierName,
                trackingNumber: tracking.trackingNumber,
                trackingUrl: tracking.trackingUrl || undefined,
              })
            }
          >
            Save tracking & ship
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-sm">
          <p className="font-semibold">Total {formatCurrency(order.totalAmount)}</p>
          <p>Payment: {order.paymentStatus}</p>
          {order.address && (
            <p className="mt-2 text-slate-600">
              Ship to: {order.address.addressLine1}, {order.address.city}, {order.address.pincode}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
