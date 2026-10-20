"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Mail } from "lucide-react";

export function PlacementDashboardHub() {
  const [status, setStatus] = useState<{
    subscribed: boolean;
    hasResume: boolean;
    emailConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/student/placement/status", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/student/placement/smtp", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([st, smtp]) => {
        setStatus({
          subscribed: !!st.subscribed,
          hasResume: !!st.hasResume,
          emailConfigured: !!smtp.emailConfigured,
        });
      })
      .catch(() => setStatus({ subscribed: false, hasResume: false, emailConfigured: false }));
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-100">
            <Briefcase className="h-4 w-4" /> Placement cell
          </p>
          <h2 className="mt-2 text-2xl font-bold">Jobs, resume & email apply</h2>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Browse all job postings, upload your resume, set Gmail app password, and apply with resume attached.
          </p>
          {status ? (
            <ul className="mt-4 space-y-1 text-xs text-indigo-100">
              <li>{status.subscribed ? "✓ Placement subscription active" : "○ Subscription — ask admin to enable"}</li>
              <li>{status.hasResume ? "✓ Resume uploaded" : "○ Upload resume in placement profile"}</li>
              <li>{status.emailConfigured ? "✓ Email setup done" : "○ Complete email setup below"}</li>
            </ul>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50">
            <Link href="/placement">View all jobs</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
            <Link href="/profile/placement">
              <FileText className="mr-2 h-4 w-4" />
              Resume & templates
            </Link>
          </Button>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-indigo-100">
        <Mail className="h-3.5 w-3.5" />
        Scroll down for <strong className="font-semibold text-white">Placement email setup</strong> (Gmail + app password).
      </p>
    </section>
  );
}
