"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function SuccessContent() {
  const params = useSearchParams();
  const appOrderId = params.get("app_order_id");
  const orderIdParam = params.get("order_id");
  const orderId = appOrderId ?? orderIdParam;
  const [status, setStatus] = useState("Verifying payment...");

  useEffect(() => {
    if (!orderId) return;
    fetch("/api/payments/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appOrderId: appOrderId ?? undefined,
        orderId: orderId ?? undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "SUCCESS") {
          setStatus("SUCCESS");
          toast.success("Note purchased successfully.");
        } else {
          setStatus(d.status ?? "PENDING");
        }
      });
  }, [orderId, appOrderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Purchase Confirmation</h1>
      <p className="mt-3 text-slate-600">Payment status: {status}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/purchases">View Purchased Notes</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/transactions">View Transactions</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={<p className="py-20 text-center">Loading...</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
