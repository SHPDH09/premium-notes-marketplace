"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { loginFailureMessage, type LoginFailureReason } from "@/lib/credential-login-messages";

export default function AdminLoginPage() {
  const router = useRouter();
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
      body: JSON.stringify({ email, password, mode: "admin" }),
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
      admin: "true",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Session could not be created. Refresh and try again.");
      return;
    }
    toast.success("Admin login successful");
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <BrandLogo />
          <CardTitle>Admin Login</CardTitle>
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
              {loading ? "Signing in..." : "Login to Admin Panel"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Student account?{" "}
            <Link href="/login" className="text-indigo-600">
              Student Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
