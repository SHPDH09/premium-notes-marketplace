"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(noteId: string) {
    await fetch(`/api/cart?noteId=${noteId}`, { method: "DELETE" });
    toast.success("Removed from cart");
    load();
  }

  async function applyCoupon() {
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", code: coupon }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Coupon applied");
    setCart(data.summary);
  }

  async function checkout() {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Checkout failed");

    if (data.free) {
      toast.success("Note purchased successfully.");
      router.push(`/checkout/success?order_id=${data.orderId}`);
      return;
    }

    router.push(`/checkout/pay?session=${encodeURIComponent(data.paymentSessionId)}&order=${data.orderId}`);
  }

  return (
    <StudentShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          {loading ? (
            <p className="text-slate-500">Loading cart...</p>
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
            <Button className="w-full" disabled={!cart?.items?.length} onClick={checkout}>
              Proceed to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
