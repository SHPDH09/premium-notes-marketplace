"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoading } from "@/components/brand/brand-loading";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

type Report = {
  generatedAt: string;
  summary: { totalRevenue: number; notesRevenue: number; placementRevenue: number };
  notes: { totalOrders: number; paidOrders: number; revenue: number };
  placementSubscriptions: { active: number; total: number; paidPlanOrders: number; revenue: number };
  jobs: {
    liveOnBoard: number;
    pendingStudentReview: number;
    totalApplications: number;
    topByApplies: { title: string; company: string; applyCount: number; viewCount: number }[];
    topByViews: { title: string; company: string; applyCount: number; viewCount: number }[];
  };
  applications: {
    appliedAt: string;
    channel: string;
    user: { name: string; email: string };
    job: { title: string; company: string };
  }[];
};

const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981"];

export default function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/platform", { credentials: "include" })
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  const revenuePie = useMemo(() => {
    if (!report) return [];
    return [
      { name: "Notes", value: report.summary.notesRevenue },
      { name: "Placement plans", value: report.summary.placementRevenue },
    ].filter((d) => d.value > 0);
  }, [report]);

  if (loading) return <BrandLoading fullPage message="Building reports…" />;
  if (!report) return <p className="text-slate-500">Could not load report.</p>;

  return (
    <div id="platform-report" className="space-y-8 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Platform reports</h1>
          <p className="text-slate-500">Notes, placement subscriptions, jobs, and applications.</p>
          <p className="text-xs text-slate-400">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
        <Button type="button" onClick={() => window.print()}>
          Download PDF (print)
        </Button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">TechLaunchpad — Platform report</h1>
        <p className="text-sm text-slate-600">{new Date(report.generatedAt).toLocaleString()}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue (₹)", value: report.summary.totalRevenue.toFixed(0) },
          { label: "Notes paid orders", value: report.notes.paidOrders },
          { label: "Active placement subs", value: report.placementSubscriptions.active },
          { label: "Job applications", value: report.jobs.totalApplications },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue split</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenuePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {revenuePie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toFixed(0)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top jobs by applications</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.jobs.topByApplies.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="applyCount" fill="#4f46e5" name="Applies" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job views vs applies (top by views)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.jobs.topByViews.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="viewCount" fill="#0ea5e9" name="Views" />
              <Bar dataKey="applyCount" fill="#10b981" name="Applies" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent job applications (who applied where)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {report.applications.map((a) => (
                <tr key={`${a.user.email}-${a.appliedAt}-${a.job.title}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {a.user.name}
                    <br />
                    <span className="text-xs text-slate-500">{a.user.email}</span>
                  </td>
                  <td className="py-2 pr-4">
                    {a.job.title}
                    <br />
                    <span className="text-xs text-slate-500">{a.job.company}</span>
                  </td>
                  <td className="py-2 pr-4">{a.channel.replace(/_/g, " ")}</td>
                  <td className="py-2">{new Date(a.appliedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="print:break-before-page">
        <CardHeader>
          <CardTitle>Notes sales snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>Total orders: {report.notes.totalOrders}</p>
          <p>Paid orders: {report.notes.paidOrders}</p>
          <p>Revenue: ₹{report.notes.revenue.toFixed(2)}</p>
          <p className="mt-2">Placement plan revenue: ₹{report.placementSubscriptions.revenue.toFixed(2)}</p>
          <p>Live jobs on board: {report.jobs.liveOnBoard}</p>
          <p>Pending student submissions: {report.jobs.pendingStudentReview}</p>
        </CardContent>
      </Card>
    </div>
  );
}
