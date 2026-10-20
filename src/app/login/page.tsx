"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoading } from "@/components/brand/brand-loading";
import { toast } from "sonner";
import { loginFailureMessage, type LoginFailureReason } from "@/lib/credential-login-messages";
import { studentDashboardPath } from "@/lib/login-redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).toLowerCase().trim();
    const password = String(form.get("password"));

    const precheck = await fetch("/api/auth/login-validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode: "student" }),
    });
    const precheckData = (await precheck.json().catch(() => ({}))) as {
      ok?: boolean;
      reason?: LoginFailureReason;
      message?: string;
    };
    if (!precheckData.ok) {
      setLoading(false);
      toast.error(
        precheckData.message ||
          loginFailureMessage(precheckData.reason ?? "INVALID_CREDENTIALS")
      );
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      admin: "false",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error(
        "Session could not be created. Refresh the page and try again, or contact support if this continues."
      );
      return;
    }
    if (!res?.ok) {
      toast.error("Login failed. Please try again.");
      return;
    }
    toast.success("Welcome back!");
    router.push(studentDashboardPath(callbackUrl));
    router.refresh();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Student Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Platform admin?{" "}
          <Link href="/admin/login" className="text-indigo-600">
            Admin Login
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-indigo-600">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto flex max-w-md px-4 py-16">
        <Suspense fallback={<BrandLoading fullPage className="w-full" message="Loading…" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
