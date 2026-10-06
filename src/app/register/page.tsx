"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      phone: String(form.get("phone") || ""),
      password: String(form.get("password")),
    };
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error(typeof data.error === "string" ? data.error : "Registration failed");
      return;
    }
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      admin: "false",
      redirect: false,
    });
    setLoading(false);
    toast.success("Account created successfully");
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    router.refresh();
  }

  return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Student Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Register"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-indigo-600">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
  );
}

export default function RegisterPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto flex max-w-md px-4 py-16">
        <Suspense fallback={<Card className="w-full p-8 text-center text-slate-500">Loading...</Card>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
