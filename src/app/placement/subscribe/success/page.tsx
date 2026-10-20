"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { BrandLoading } from "@/components/brand/brand-loading";
import { toast } from "sonner";

function SuccessContent() {
  const params = useSearchParams();
  const planOrderId = params.get("plan_order_id");
  const orderIdParam = params.get("order_id");
  const [status, setStatus] = useState("Verifying payment…");

  useEffect(() => {
    if (!planOrderId && !orderIdParam) return;
    fetch("/api/payments/verify-placement-plan", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planOrderId: planOrderId ?? undefined,
        orderId: orderIdParam ?? undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "SUCCESS") {
          setStatus("SUCCESS");
          toast.success("Placement subscription active!");
        } else {
          setStatus(d.status ?? "PENDING");
        }
      });
  }, [planOrderId, orderIdParam]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Subscription payment</h1>
      <p className="mt-3 text-slate-600">Status: {status}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/placement">View jobs</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/profile/placement">Placement profile</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PlacementSubscribeSuccessPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={<BrandLoading fullPage message="Loading…" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
