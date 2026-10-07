"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";

export default function PhysicalCartPage() {
  const [cart, setCart] = useState<any>(null);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { status } = useSession();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/physical-cart", { credentials: "include", cache: "no-store" });
    const data = await readJsonResponse(res);
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/physical-cart")}`);
      return;
    }
    setCart(data);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/physical-cart")}`);
      return;
    }
    void load();
  }, [status, router]);

  async function remove(itemId: string) {
    await fetch(`/api/physical-cart?itemId=${itemId}`, { method: "DELETE", credentials: "include" });
    toast.success("Removed");
    load();
  }

  async function applyCoupon() {
    const res = await fetch("/api/physical-cart/coupon", {
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

  return (
    <StudentShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">Physical Cart</h1>
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : !cart?.items?.length ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-slate-500">Your physical cart is empty.</p>
                <Button asChild className="mt-4">
                  <Link href="/physical-documents">Browse documents</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            cart.items.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatCurrency(item.unitPrice)} × {item.quantity} ={" "}
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => remove(item.id)}>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(cart?.subtotal ?? 0)}</span>
            </div>
            {cart?.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon</span>
                <span>-{formatCurrency(cart.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatCurrency(cart?.deliveryCharge ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(cart?.total ?? 0)}</span>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <Button variant="outline" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
            <Button asChild className="w-full" disabled={!cart?.items?.length}>
              <Link href="/physical-checkout">Proceed to checkout</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
