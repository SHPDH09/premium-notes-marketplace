"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoading } from "@/components/brand/brand-loading";
import { JobApplyDialog } from "@/components/placement/job-apply-dialog";
import { PlacedStudentsStrip } from "@/components/placement/placed-students-strip";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

type JobApplyType = "EMAIL" | "LINK" | "WALK_IN";

type Job = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  applyType: JobApplyType;
  description: string;
};

const APPLY_TYPE_FILTERS: { value: "ALL" | JobApplyType; label: string }[] = [
  { value: "ALL", label: "All types" },
  { value: "EMAIL", label: "Email based" },
  { value: "LINK", label: "Link based" },
  { value: "WALK_IN", label: "Walk-in" },
];

export default function PlacementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<string>("login_required");
  const [canApply, setCanApply] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | JobApplyType>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/placement/jobs", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAccess(d.access);
        setCanApply(!!d.canApply);
        setJobs(d.jobs ?? []);
        setPlans(d.plans ?? []);
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (typeFilter !== "ALL" && job.applyType !== typeFilter) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.location?.toLowerCase().includes(q) ?? false) ||
        job.description.toLowerCase().includes(q)
      );
    });
  }, [jobs, typeFilter, search]);

  function onApply(job: Job) {
    if (status !== "authenticated" || session?.user?.role !== "STUDENT") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/placement")}`);
      return;
    }
    if (!canApply) {
      if (access === "subscription_required") {
        toast.message("Placement subscription required. Complete your profile or contact admin.");
      }
      router.push("/profile/placement");
      return;
    }
    setApplyJob(job);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Briefcase className="h-3.5 w-3.5" /> Placement cell
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">All job postings</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Browse openings below. Tap <strong>Apply</strong> — login or subscription is handled automatically.
            </p>
          </div>
          {session?.user?.role === "STUDENT" ? (
            <Button variant="outline" asChild>
              <Link href="/profile/placement">My placement profile</Link>
            </Button>
          ) : null}
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter jobs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="job-search">Search</Label>
              <Input
                id="job-search"
                placeholder="Title, company, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="job-type">Job type</Label>
              <select
                id="job-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              >
                {APPLY_TYPE_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <PlacedStudentsStrip />
        </div>

        {loading ? (
          <BrandLoading message="Loading jobs…" />
        ) : !jobs.length ? (
          <p className="rounded-xl border bg-white p-8 text-center text-slate-500">No active jobs right now.</p>
        ) : !filteredJobs.length ? (
          <p className="rounded-xl border bg-white p-8 text-center text-slate-500">
            No jobs match your filter. Try another type or search.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
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
            ))}
          </div>
        )}

        {access === "subscription_required" && plans.length > 0 ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Placement plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-600">
                To apply, you need an active placement plan. Contact admin or review plans below.
              </p>
              <ul className="space-y-2">
                {plans.map((p) => (
                  <li key={p.id} className="rounded-lg border bg-white px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    {p.priceLabel ? <span className="text-slate-500"> — {p.priceLabel}</span> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </main>
      <SiteFooter />
      <JobApplyDialog job={applyJob} open={!!applyJob} onOpenChange={(v) => !v && setApplyJob(null)} />
    </div>
  );
}
