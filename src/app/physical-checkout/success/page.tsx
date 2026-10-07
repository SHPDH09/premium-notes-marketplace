"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { verifyPhysicalPayment } from "@/lib/physical/verify-payment-client";

function SuccessContent() {
  const params = useSearchParams();
  const physicalOrderId = params.get("physical_order_id");
  const orderIdParam = params.get("order_id");

  const verifyPayload = useMemo(
    () => ({
      physicalOrderId,
      cashfreeOrderId: physicalOrderId ? orderIdParam : null,
      orderId: physicalOrderId ? null : orderIdParam,
    }),
    [physicalOrderId, orderIdParam]
  );

  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(physicalOrderId);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<"verifying" | "success" | "pending">("verifying");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    async function runVerify() {
      if (!verifyPayload.physicalOrderId && !verifyPayload.orderId && !verifyPayload.cashfreeOrderId) {
        setStatus("pending");
        return;
      }

      const data = await verifyPhysicalPayment(verifyPayload);
      if (cancelled) return;

      if (typeof data.orderId === "string") setResolvedOrderId(data.orderId);
      if (typeof data.orderNumber === "string") setOrderNumber(data.orderNumber);

      if (data.status === "SUCCESS") {
        setStatus("success");
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(() => void runVerify(), 2000);
      } else {
        setStatus("pending");
      }
    }

    void runVerify();
    return () => {
      cancelled = true;
    };
  }, [verifyPayload]);

  const viewOrderHref = resolvedOrderId ? `/physical-orders/${resolvedOrderId}` : "/physical-orders";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">
        {status === "success" ? "Order confirmed" : "Payment verification"}
      </h1>
      {orderNumber && <p className="mt-2 font-mono text-indigo-700">{orderNumber}</p>}
      <p className="mt-4 text-slate-600">
        {status === "success"
          ? "Your physical order has been placed. We will notify you as it progresses."
          : status === "verifying"
            ? "Confirming your payment with the bank…"
            : "If you completed payment, confirmation may take a moment. Refresh this page or open your order below."}
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <Button asChild>
          <Link href={viewOrderHref}>View order</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/physical-orders">All physical orders</Link>
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
