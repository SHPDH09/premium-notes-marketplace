"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatApiError } from "@/lib/api/format-api-error";
import { toast } from "sonner";
import { Eye, Send, Users } from "lucide-react";
import {
  JobPostingFormFields,
  emptyJobPostingForm,
  jobFormToPayload,
  type JobPostingFormState,
} from "@/components/placement/job-posting-form-fields";

type Submission = {
  id: string;
  title: string;
  company: string;
  reviewStatus: string;
  adminReviewNote?: string | null;
  viewCount: number;
  applyCount: number;
  applyType: string;
  description: string;
  location?: string | null;
  applyEmail?: string | null;
  applyUrl?: string | null;
  applyPhone?: string | null;
  walkInDetails?: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending admin review";
    case "APPROVED":
      return "Approved — awaiting verify";
    case "VERIFIED":
      return "Live on job board";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function submissionToForm(s: Submission): JobPostingFormState {
  return {
    title: s.title,
    company: s.company,
    location: s.location ?? "",
    applyType: s.applyType as JobPostingFormState["applyType"],
    description: s.description,
    applyEmail: s.applyEmail ?? "",
    applyUrl: s.applyUrl ?? "",
    applyPhone: s.applyPhone ?? "",
    walkInDetails: s.walkInDetails ?? "",
  };
}

export function StudentJobPostingsSection() {
  const [jobs, setJobs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<JobPostingFormState>(emptyJobPostingForm());
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/student/placement/job-submissions", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/student/placement/job-submissions/${editingId}`
        : "/api/student/placement/job-submissions";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobFormToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(formatApiError(data.error));
        return;
      }
      toast.success(editingId ? "Updated — sent for review again" : "Job submitted for admin approval");
      setForm(emptyJobPostingForm());
      setEditingId(null);
      load();
      window.dispatchEvent(new Event("tl-job-posts-changed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Post a job opening
          <Badge>Student submission</Badge>
        </CardTitle>
        <p className="text-sm text-slate-500">
          Same format as admin job posts. After submit, admin will approve, edit, and verify — then it goes live on
          Placement. You can track views and apply counts here.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-slate-50/80 p-4">
          <JobPostingFormFields form={form} setForm={setForm} idPrefix="student-job" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting…" : editingId ? "Update & resubmit" : "Submit for approval"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyJobPostingForm());
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          <h3 className="mb-3 font-semibold text-slate-900">Your job posts</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !jobs.length ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <ul className="space-y-3">
              {jobs.map((j) => (
                <li key={j.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {j.title} · {j.company}
                      </p>
                      <p className="text-xs text-indigo-600">{statusLabel(j.reviewStatus)}</p>
                      {j.adminReviewNote && j.reviewStatus === "REJECTED" ? (
                        <p className="mt-2 text-xs text-amber-800">Admin note: {j.adminReviewNote}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" /> {j.viewCount} views
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" /> {j.applyCount} applies
                      </span>
                    </div>
                  </div>
                  {(j.reviewStatus === "PENDING" || j.reviewStatus === "REJECTED") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setEditingId(j.id);
                        setForm(submissionToForm(j));
                      }}
                    >
                      Edit & resubmit
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
