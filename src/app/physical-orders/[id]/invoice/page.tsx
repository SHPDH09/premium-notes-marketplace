"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { brand } from "@/config/brand";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PhysicalInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/physical-orders/${id}`, { credentials: "include" });
      const data = await res.json();
      let orderData = data.order;
      if (orderData?.paymentStatus === "PENDING") {
        await fetch("/api/payments/verify-physical", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ physicalOrderId: id }),
        });
        const again = await fetch(`/api/physical-orders/${id}`, { credentials: "include" });
        const refreshed = await again.json();
        orderData = refreshed.order ?? orderData;
      }
      setOrder(orderData);
    }
    void load();
  }, [id]);

  if (!order) return <p className="p-8 text-center">Loading invoice…</p>;

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex justify-between print:hidden">
          <Button onClick={() => window.print()}>Print / Download</Button>
        </div>
        <header className="border-b pb-4">
          <p className="text-2xl font-bold">{brand.name}</p>
          <p className="text-sm text-slate-500">Tax Invoice / Receipt</p>
        </header>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">Order</p>
            <p>{order.orderNumber}</p>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold">Bill to</p>
            <p>{order.studentName}</p>
            <p>{order.studentEmail}</p>
            <p>{order.studentPhone}</p>
          </div>
        </div>
        {order.address && (
          <div className="text-sm">
            <p className="font-semibold">Ship to</p>
            <p>
              {order.address.fullName}, {order.address.addressLine1}, {order.address.city},{" "}
              {order.address.pincode}
            </p>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i: any) => (
              <tr key={i.id} className="border-b">
                <td className="py-2">{i.documentTitle}</td>
                <td>{i.quantity}</td>
                <td>{formatCurrency(i.unitPrice)}</td>
                <td className="text-right">{formatCurrency(i.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 text-sm text-right">
          {order.couponDiscount > 0 && (
            <p>Discount: -{formatCurrency(order.couponDiscount)}</p>
          )}
          <p>Delivery: {formatCurrency(order.deliveryCharge)}</p>
          <p className="text-lg font-bold">Total: {formatCurrency(order.totalAmount)}</p>
          <p className="text-slate-500">
            Payment:{" "}
            {order.paymentStatus === "SUCCESS"
              ? "Paid"
              : order.paymentStatus === "PENDING"
                ? "Pending confirmation"
                : order.paymentStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
