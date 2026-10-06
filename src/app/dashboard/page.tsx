"use client";

import Link from "next/link";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <StudentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
          <p className="text-slate-500">Manage cart, purchases, and profile in one place.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Cart", href: "/cart", desc: "Apply coupons & checkout" },
            { title: "Purchased Notes", href: "/purchases", desc: "Secure access to content" },
            { title: "Transactions", href: "/transactions", desc: "Payment history" },
            { title: "Profile", href: "/profile", desc: "Update account details" },
          ].map((item) => (
            <Card key={item.href}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500">{item.desc}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={item.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button asChild>
          <Link href="/notes">Browse Notes</Link>
        </Button>
      </div>
    </StudentShell>
  );
}
