"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loginFailureMessage, type LoginFailureReason } from "@/lib/credential-login-messages";

export default function SuperAdminLoginPage() {
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
      body: JSON.stringify({ email, password, mode: "super_admin" }),
    });
    const precheckData = (await precheck.json().catch(() => ({}))) as { ok?: boolean; reason?: LoginFailureReason };
    if (!precheckData.ok) {
      setLoading(false);
      toast.error(loginFailureMessage(precheckData.reason ?? "INVALID_CREDENTIALS"));
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      portal: "super_admin",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Session could not be created.");
      return;
    }
    router.push("/super-admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle>Super Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="bg-slate-950" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required className="bg-slate-950" />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Platform login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
