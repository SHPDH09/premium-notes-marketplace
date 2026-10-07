"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PhysicalFulfillmentStatus } from "@prisma/client";
import { PhysicalOrderJourney } from "@/components/physical/order-journey";

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
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState({ courierName: "", trackingNumber: "", trackingUrl: "" });
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/physical-orders/${id}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not load order");
      return;
    }
    setOrder(data.order);
    if (data.order) {
      setTracking({
        courierName: data.order.courierName ?? "",
        trackingNumber: data.order.trackingNumber ?? "",
        trackingUrl: data.order.trackingUrl ?? "",
      });
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function patch(body: unknown) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/physical-orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      toast.success("Order updated");
      setOrder(data.order);
      if (data.order) {
        setTracking({
          courierName: data.order.courierName ?? tracking.courierName,
          trackingNumber: data.order.trackingNumber ?? tracking.trackingNumber,
          trackingUrl: data.order.trackingUrl ?? tracking.trackingUrl,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-slate-500">
            {order.studentName} · {order.studentPhone}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="default">Fulfillment: {order.fulfillmentLabel}</Badge>
            <Badge variant="warning">Print: {order.printStatusLabel}</Badge>
            <Badge variant="success">Payment: {order.paymentStatus}</Badge>
          </div>
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
          <CardTitle>Order journey & transitions</CardTitle>
        </CardHeader>
        <CardContent>
          <PhysicalOrderJourney
            fulfillmentStatus={order.fulfillmentStatus}
            history={order.history ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant={order.fulfillmentStatus === a.status ? "default" : "outline"}
              disabled={busy}
              onClick={() => void patch({ action: "fulfillment", status: a.status })}
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
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void patch({ action: "print", status: "PRINTING" })}
          >
            Start print job
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patch({ action: "print", status: "PRINTED" })}
          >
            Mark printed
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patch({ action: "print", status: "QC_PASSED" })}
          >
            QC pass
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void patch({
                action: "print",
                status: "QC_FAILED",
                qcReason: "Poor print quality",
              })
            }
          >
            QC fail
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patch({ action: "pack", packageCount: 1 })}
          >
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
            disabled={busy}
            onChange={(e) => setTracking((t) => ({ ...t, courierName: e.target.value }))}
          />
          <Input
            placeholder="Tracking #"
            value={tracking.trackingNumber}
            disabled={busy}
            onChange={(e) => setTracking((t) => ({ ...t, trackingNumber: e.target.value }))}
          />
          <Input
            placeholder="Tracking URL (optional)"
            value={tracking.trackingUrl}
            disabled={busy}
            onChange={(e) => setTracking((t) => ({ ...t, trackingUrl: e.target.value }))}
          />
          <Button
            className="sm:col-span-3"
            disabled={busy}
            onClick={() =>
              void patch({
                action: "shipment",
                courierName: tracking.courierName.trim(),
                trackingNumber: tracking.trackingNumber.trim(),
                trackingUrl: tracking.trackingUrl.trim() || undefined,
              })
            }
          >
            Save tracking & ship
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment & refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Total {formatCurrency(order.totalAmount)}</p>
            <p>Payment: {order.paymentStatus}</p>
            {order.refundedAmount > 0 && (
              <p className="text-amber-700">
                Refunded {formatCurrency(order.refundedAmount)}
                {order.refundableRemaining > 0
                  ? ` · ${formatCurrency(order.refundableRemaining)} refundable left`
                  : ""}
              </p>
            )}
          </div>
          {order.refunds?.length > 0 && (
            <ul className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              {order.refunds.map((r: { id: string; amount: number; reason: string; at: string }) => (
                <li key={r.id}>
                  <span className="font-medium">{formatCurrency(r.amount)}</span>
                  <span className="text-slate-500"> · {new Date(r.at).toLocaleString()}</span>
                  <p className="text-slate-600">{r.reason}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">
            Refunds within 12 hours of payment. Max to customer after {order.platformFeePercent}%
            platform fee.{" "}
            <Link href="/privacy#refunds" className="text-indigo-600 hover:underline">
              Policy
            </Link>
          </p>
          {order.refundDeadline && order.paymentStatus === "SUCCESS" && (
            <p className="text-xs text-slate-500">
              {order.refundWindowOpen
                ? `Refund window until ${new Date(order.refundDeadline).toLocaleString()}`
                : "Refund window closed"}
            </p>
          )}
          {order.canRefund && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="phy-refund-amount">Refund amount (₹)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="phy-refund-amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    max={order.refundableRemaining}
                    value={refundAmount}
                    disabled={busy}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setRefundAmount(order.refundableRemaining.toFixed(2))}
                  >
                    Max
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="phy-refund-reason">Reason</Label>
                <Input
                  id="phy-refund-reason"
                  className="mt-1"
                  placeholder="Why refunding"
                  value={refundReason}
                  disabled={busy}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
              <Button
                className="sm:col-span-2"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  const amount = Number(refundAmount);
                  const reason = refundReason.trim();
                  if (!reason || reason.length < 3) {
                    toast.error("Enter a refund reason (min 3 characters)");
                    return;
                  }
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast.error("Enter a valid refund amount");
                    return;
                  }
                  if (amount > order.refundableRemaining + 0.001) {
                    toast.error(`Max ${formatCurrency(order.refundableRemaining)}`);
                    return;
                  }
                  void patch({ action: "refund", amount, reason }).then(() => {
                    setRefundAmount("");
                    setRefundReason("");
                  });
                }}
              >
                Process refund
              </Button>
            </div>
          )}
          {order.address && (
            <p className="text-slate-600">
              Ship to: {order.address.addressLine1}, {order.address.city}, {order.address.pincode}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
