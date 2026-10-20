"use client";

import Link from "next/link";
import { StudentShell } from "@/components/layout/student-shell";
import { PlacementEmailSetup } from "@/components/placement/placement-email-setup";
import { Button } from "@/components/ui/button";

export default function DashboardPlacementEmailSetupPage() {
  return (
    <StudentShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Placement email setup</h1>
            <p className="text-slate-500">Gmail + Google App Password for one-tap apply with resume attached.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
        <PlacementEmailSetup />
      </div>
    </StudentShell>
  );
}
