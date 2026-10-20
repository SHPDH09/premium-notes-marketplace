"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";
import { LegalAcceptance } from "@/components/legal/legal-acceptance";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
    const data = await readJsonResponse(res);
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
      return;
    }
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Could not load cart");
      setLoading(false);
      return;
    }
    setCart(data);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
      return;
    }
    void load();
  }, [status, router]);

  async function remove(noteId: string) {
    await fetch(`/api/cart?noteId=${noteId}`, { method: "DELETE", credentials: "include" });
    toast.success("Removed from cart");
    load();
  }

  async function applyCoupon() {
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", code: coupon }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Invalid coupon");
    toast.success("Coupon applied");
    setCart(data.summary);
  }

  async function checkout() {
    if (!acceptedLegal) {
      toast.error("Please accept the Terms & Conditions and Privacy Policy");
      return;
    }
    const res = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptedLegal: true }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Checkout failed");

    if (data.free) {
      toast.success("Note purchased successfully.");
      router.push(`/checkout/success?order_id=${data.orderId}`);
      return;
    }

    router.push(
      `/checkout/pay?session=${encodeURIComponent(data.paymentSessionId as string)}&order=${data.orderId}`
    );
  }

  return (
    <StudentShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          {loading ? (
            <BrandLoading fullPage message="Loading cart…" />
          ) : !cart?.items?.length ? (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">Your cart is empty.</CardContent>
            </Card>
          ) : (
            cart.items.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="flex gap-4 p-4">
                  <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-slate-100">
                    {item.coverImage && <Image src={item.coverImage} alt="" fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-indigo-600">{formatCurrency(item.finalPrice)}</p>
                  </div>
                  <Button variant="ghost" onClick={() => remove(item.noteId)}>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(cart?.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Note discounts</span>
              <span>-{formatCurrency(cart?.noteDiscount ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Coupon discount</span>
              <span>-{formatCurrency(cart?.couponDiscount ?? 0)}</span>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <Button variant="outline" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
            {cart?.couponCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch("/api/cart/coupon", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "remove" }),
                  });
                  load();
                }}
              >
                Remove coupon ({cart.couponCode})
              </Button>
            )}
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(cart?.total ?? 0)}</span>
            </div>
            <LegalAcceptance checked={acceptedLegal} onCheckedChange={setAcceptedLegal} id="cart-accept-legal" />
            <Button
              className="w-full"
              disabled={!cart?.items?.length || !acceptedLegal}
              onClick={checkout}
            >
              Proceed to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
