"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function ShippingSettingsPage() {
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    void fetch("/api/admin/settings/shipping")
      .then((r) => r.json())
      .then((d) => setForm(d.settings));
  }, []);

  async function save() {
    const res = await fetch("/api/admin/settings/shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Saved");
  }

  if (!form) return <BrandLoading fullPage message="Loading settings…" />;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Shipping settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Default delivery charge (₹)</Label>
          <Input
            type="number"
            value={form.deliveryCharge}
            onChange={(e) => setForm({ ...form, deliveryCharge: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label>Free delivery above (₹)</Label>
          <Input
            type="number"
            value={form.freeDeliveryThreshold ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                freeDeliveryThreshold: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <Label>Processing days</Label>
          <Input
            type="number"
            value={form.processingDays}
            onChange={(e) => setForm({ ...form, processingDays: parseInt(e.target.value, 10) })}
          />
        </div>
        <div>
          <Label>Shipping days</Label>
          <Input
            type="number"
            value={form.shippingDays}
            onChange={(e) => setForm({ ...form, shippingDays: parseInt(e.target.value, 10) })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.shippingEnabled}
            onChange={(e) => setForm({ ...form, shippingEnabled: e.target.checked })}
          />
          Enable shipping
        </label>
        <Button onClick={() => void save()}>Save</Button>
      </CardContent>
    </Card>
  );
}
