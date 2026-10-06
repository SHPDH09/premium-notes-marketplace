"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { toast } from "sonner";

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
        await cashfree?.checkout({
          paymentSessionId: sessionId,
          redirectTarget: "_self",
        });
      } catch {
        toast.error("Unable to launch payment");
      }
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [sessionId, orderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Redirecting to secure payment...</h1>
      <p className="mt-2 text-slate-500">Order {orderId}</p>
      <button
        className="mt-6 text-sm text-indigo-600 underline"
        onClick={() => router.push(`/checkout/success?order_id=${orderId}`)}
      >
        I completed payment
      </button>
    </div>
  );
}

export default function CheckoutPayPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={<p className="py-20 text-center">Loading checkout...</p>}>
        <PayContent />
      </Suspense>
    </div>
  );
}
