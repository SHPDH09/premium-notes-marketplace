"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoading } from "@/components/brand/brand-loading";
import { JobApplyDialog } from "@/components/placement/job-apply-dialog";
import { PlacedStudentsStrip } from "@/components/placement/placed-students-strip";
import { Briefcase } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  applyType: "EMAIL" | "LINK" | "WALK_IN";
  description: string;
};

export default function PlacementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<string>("login_required");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    fetch("/api/placement/jobs", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAccess(d.access);
        setJobs(d.jobs ?? []);
        setPlans(d.plans ?? []);
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  function onApply(job: Job) {
    if (status !== "authenticated" || session?.user?.role !== "STUDENT") {
      router.push(`/register?callbackUrl=${encodeURIComponent("/placement")}`);
      return;
    }
    if (access !== "full") {
      router.push("/profile/placement");
      return;
    }
    setApplyJob(job);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Briefcase className="h-3.5 w-3.5" /> Placement cell
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Job opportunities</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Exclusive openings for subscribed placement members. Upload your resume once and apply with
              AI-assisted email templates.
            </p>
          </div>
          {session?.user?.role === "STUDENT" ? (
            <Button variant="outline" asChild>
              <Link href="/profile/placement">My placement profile</Link>
            </Button>
          ) : null}
        </div>

        <div className="mb-8">
          <PlacedStudentsStrip />
        </div>

        {loading ? (
          <BrandLoading message="Loading jobs…" />
        ) : access === "login_required" ? (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-slate-600">Login or register to view placement jobs.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href={`/register?callbackUrl=${encodeURIComponent("/placement")}`}>Register</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={`/login?callbackUrl=${encodeURIComponent("/placement")}`}>Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : access === "subscription_required" ? (
          <Card>
            <CardHeader>
              <CardTitle>Placement subscription required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Job listings are visible only to students with an active placement subscription. Contact admin or
                choose a plan below once enrollment is enabled.
              </p>
              <ul className="space-y-2">
                {plans.map((p) => (
                  <li key={p.id} className="rounded-lg border bg-white px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    {p.priceLabel ? <span className="text-slate-500"> — {p.priceLabel}</span> : null}
                    {p.description ? <p className="mt-1 text-slate-500">{p.description}</p> : null}
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link href="/profile/placement">Complete placement profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {!jobs.length ? (
              <p className="rounded-xl border bg-white p-8 text-center text-slate-500">No active jobs right now.</p>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {job.company}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {job.applyType.replace("_", " ")}
                      </p>
                    </div>
                    <Button onClick={() => onApply(job)}>Apply</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{job.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
      <SiteFooter />
      <JobApplyDialog job={applyJob} open={!!applyJob} onOpenChange={(v) => !v && setApplyJob(null)} />
    </div>
  );
}
