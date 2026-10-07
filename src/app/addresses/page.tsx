"use client";

import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const empty = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [form, setForm] = useState(empty);

  async function load() {
    const res = await fetch("/api/addresses", { credentials: "include" });
    const data = await res.json();
    setAddresses(data.addresses ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const res = await fetch("/api/addresses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Address saved");
    setForm(empty);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Deleted");
    load();
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        {addresses.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex justify-between p-4 text-sm">
              <div>
                <p className="font-semibold">
                  {a.fullName} {a.isDefault && <span className="text-indigo-600">(Default)</span>}
                </p>
                <p>
                  {a.addressLine1}, {a.city}, {a.state} {a.pincode}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => remove(a.id)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Add address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["fullName", "Full name"],
                ["phone", "Phone"],
                ["addressLine1", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Pincode"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Set as default
            </label>
            <Button className="sm:col-span-2" onClick={() => void save()}>
              Save address
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
