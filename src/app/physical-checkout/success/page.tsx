"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { readJsonResponse } from "@/lib/api/fetch-json";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order_id");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!orderId) return;
    void (async () => {
      const res = await fetch("/api/payments/verify-physical", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await readJsonResponse(res);
      if (typeof data.orderNumber === "string") setOrderNumber(data.orderNumber);
      setStatus(data.status === "SUCCESS" ? "success" : "pending");
    })();
  }, [orderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">
        {status === "success" ? "Order confirmed" : "Payment verification"}
      </h1>
      {orderNumber && <p className="mt-2 font-mono text-indigo-700">{orderNumber}</p>}
      <p className="mt-4 text-slate-600">
        {status === "success"
          ? "Your physical order has been placed. We will notify you as it progresses."
          : "If you completed payment, confirmation may take a moment."}
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <Button asChild>
          <Link href="/physical-orders">View order</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PhysicalCheckoutSuccessPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={<p className="py-20 text-center">Loading…</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
