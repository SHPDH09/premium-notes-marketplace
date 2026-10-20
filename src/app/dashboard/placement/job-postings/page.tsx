"use client";

import Link from "next/link";
import { StudentShell } from "@/components/layout/student-shell";
import { StudentJobPostingsSection } from "@/components/placement/student-job-postings-section";
import { Button } from "@/components/ui/button";

export default function DashboardJobPostingsPage() {
  return (
    <StudentShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My job postings</h1>
            <p className="text-slate-500">Submit openings for admin approval and track views & applies.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
        <StudentJobPostingsSection />
      </div>
    </StudentShell>
  );
}
