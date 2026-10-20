"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PrintOrderSheetPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    void fetch(`/api/admin/physical-orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order));
  }, [id]);

  if (!order) return null;

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="mb-4 print:hidden">
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      <h1 className="text-xl font-bold">Print order — {order.orderNumber}</h1>
      <p className="text-sm">{order.studentName} · {order.studentPhone}</p>
      {order.address && (
        <p className="mt-2 text-sm">
          {order.address.fullName}
          <br />
          {order.address.addressLine1}
          <br />
          {order.address.city}, {order.address.state} {order.address.pincode}
        </p>
      )}
      <table className="mt-6 w-full border text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">Document</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Print</th>
            <th className="border p-2">Paper</th>
            <th className="border p-2">Binding</th>
            <th className="border p-2">Pages</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i: any) => (
            <tr key={i.id}>
              <td className="border p-2">{i.documentTitle}</td>
              <td className="border p-2 text-center">{i.quantity}</td>
              <td className="border p-2 text-center">{i.printType}</td>
              <td className="border p-2 text-center">{i.paperType}</td>
              <td className="border p-2 text-center">{i.bindingType}</td>
              <td className="border p-2 text-center">{i.pageCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
