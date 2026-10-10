"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { BrandLogo } from "@/components/brand/logo";
import { toast } from "sonner";
import { brand } from "@/config/brand";
import { BrandLoading } from "@/components/brand/brand-loading";

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: string }) => Promise<void>;
    };
  }
}

function PayContent() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const sessionId = params.get("session");
  const orderId = params.get("order");

  useEffect(() => {
    if (!sessionId || !orderId || started.current) return;
    started.current = true;
    const mode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = async () => {
      try {
        const cashfree = window.Cashfree?.({ mode });
        await cashfree?.checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
      } catch {
        toast.error("Unable to launch payment");
      }
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [sessionId, orderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-2xl font-bold">Pay {brand.name}</h1>
        <p className="mt-4 text-sm text-slate-500">Redirecting to Cashfree…</p>
        <button
          type="button"
          className="mt-8 text-sm text-indigo-600 underline"
          onClick={() =>
            router.push(`/physical-checkout/success?physical_order_id=${encodeURIComponent(orderId ?? "")}`)
          }
        >
          I completed payment
        </button>
      </div>
    </div>
  );
}

export default function PhysicalCheckoutPayPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={<BrandLoading fullPage message="Loading checkout…" />}>
        <PayContent />
      </Suspense>
    </div>
  );
}
