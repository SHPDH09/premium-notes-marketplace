"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoading } from "@/components/brand/brand-loading";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { formatApiError } from "@/lib/api/format-api-error";
import { studentDashboardPath } from "@/lib/login-redirect";

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
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).toLowerCase().trim(),
      phone: String(form.get("phone") || "").trim(),
      password: String(form.get("password")),
    };
    if (payload.name.length < 2) {
      setLoading(false);
      toast.error("Name must be at least 2 characters");
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error(formatApiError(data.error));
      return;
    }
    const signInRes = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      admin: "false",
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) {
      toast.success("Account created. Please sign in.");
      router.push(`/login?callbackUrl=${encodeURIComponent(studentDashboardPath(callbackUrl))}`);
      return;
    }
    toast.success("Account created successfully");
    router.push(studentDashboardPath(callbackUrl));
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
                <Input id="name" name="name" minLength={2} required />
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
        <Suspense fallback={<BrandLoading fullPage className="w-full" message="Loading…" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
