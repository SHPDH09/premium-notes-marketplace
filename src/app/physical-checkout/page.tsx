"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";
import { LegalAcceptance } from "@/components/legal/legal-acceptance";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function PhysicalCheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    altPhone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    void Promise.all([
      fetch("/api/physical-cart", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/addresses", { credentials: "include" }).then((r) => r.json()),
    ]).then(([c, a]) => {
      setCart(c);
      setAddresses(a.addresses ?? []);
      const def = a.addresses?.find((x: any) => x.isDefault) ?? a.addresses?.[0];
      if (def) {
        setAddressId(def.id);
        setForm({
          fullName: def.fullName,
          phone: def.phone,
          altPhone: "",
          addressLine1: def.addressLine1,
          addressLine2: def.addressLine2 ?? "",
          landmark: def.landmark ?? "",
          city: def.city,
          state: def.state,
          pincode: def.pincode,
          country: def.country,
        });
      } else if (session?.user?.name) {
        setForm((f) => ({ ...f, fullName: session.user.name ?? "" }));
      }
    });
  }, [status, session]);

  async function pay() {
    if (!acceptedLegal) {
      toast.error("Please accept Terms & Privacy Policy");
      return;
    }
    const payload: Record<string, unknown> = {
      acceptedLegal: true,
      idempotencyKey: crypto.randomUUID(),
    };
    if (addressId) payload.addressId = addressId;
    else payload.address = form;

    const res = await fetch("/api/physical-checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Checkout failed");

    if (data.free) {
      router.push(`/physical-checkout/success?order_id=${data.physicalOrderId}`);
      return;
    }
    router.push(
      `/physical-checkout/pay?session=${encodeURIComponent(String(data.paymentSessionId))}&order=${data.physicalOrderId}`
    );
  }

  if (status === "loading") {
    return (
      <StudentShell>
        <BrandLoading fullPage message="Loading checkout…" />
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Physical Checkout</h1>

        <Card>
          <CardHeader>
            <CardTitle>Student information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-slate-500">Name</span>
              <br />
              <strong>{session?.user?.name}</strong>
            </p>
            <p>
              <span className="text-slate-500">Email</span>
              <br />
              <strong>{session?.user?.email}</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Delivery address</CardTitle>
            <Link href="/addresses" className="text-sm text-indigo-600">
              My addresses
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {addresses.length > 0 && (
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={addressId}
                onChange={(e) => {
                  setAddressId(e.target.value);
                  const a = addresses.find((x) => x.id === e.target.value);
                  if (a) {
                    setForm({
                      fullName: a.fullName,
                      phone: a.phone,
                      altPhone: "",
                      addressLine1: a.addressLine1,
                      addressLine2: a.addressLine2 ?? "",
                      landmark: a.landmark ?? "",
                      city: a.city,
                      state: a.state,
                      pincode: a.pincode,
                      country: a.country,
                    });
                  }
                }}
              >
                <option value="">Enter new address</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}, {a.city}
                  </option>
                ))}
              </select>
            )}
            {!addressId && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["fullName", "Full name"],
                    ["phone", "Phone"],
                    ["addressLine1", "Address line 1"],
                    ["addressLine2", "Address line 2"],
                    ["landmark", "Landmark"],
                    ["city", "City"],
                    ["state", "State"],
                    ["pincode", "Pincode"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className={key === "addressLine1" ? "sm:col-span-2" : ""}>
                    <Label>{label}</Label>
                    <Input
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(cart?.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatCurrency(cart?.deliveryCharge ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Pay</span>
              <span>{formatCurrency(cart?.total ?? 0)}</span>
            </div>
            <LegalAcceptance checked={acceptedLegal} onCheckedChange={setAcceptedLegal} />
            <Button className="w-full" onClick={() => void pay()}>
              Pay securely
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
