"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLoading } from "@/components/brand/brand-loading";
import { toast } from "sonner";
import {
  JobPostingFormFields,
  jobFormToPayload,
  type JobPostingFormState,
} from "@/components/placement/job-posting-form-fields";

type AdminSubmission = {
  id: string;
  title: string;
  company: string;
  reviewStatus: string;
  viewCount: number;
  applyCount: number;
  adminReviewNote?: string | null;
  submittedBy?: { name: string; email: string } | null;
  applyType: string;
  description: string;
  location?: string | null;
  applyEmail?: string | null;
  applyUrl?: string | null;
  applyPhone?: string | null;
  walkInDetails?: string | null;
};

function toForm(j: AdminSubmission): JobPostingFormState {
  return {
    title: j.title,
    company: j.company,
    location: j.location ?? "",
    applyType: j.applyType as JobPostingFormState["applyType"],
    description: j.description,
    applyEmail: j.applyEmail ?? "",
    applyUrl: j.applyUrl ?? "",
    applyPhone: j.applyPhone ?? "",
    walkInDetails: j.walkInDetails ?? "",
  };
}

export default function AdminStudentSubmissionsPage() {
  const [jobs, setJobs] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, JobPostingFormState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/placement/student-submissions", { credentials: "include" });
    const data = await res.json();
    setJobs(data.jobs ?? []);
    const forms: Record<string, JobPostingFormState> = {};
    for (const j of data.jobs ?? []) forms[j.id] = toForm(j);
    setEditing(forms);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, action: "approve" | "verify" | "reject" | "save") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/placement/student-submissions/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminReviewNote: notes[id] || null,
          job: jobFormToPayload(editing[id]!),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success(
        action === "verify"
          ? "Verified — job is live"
          : action === "approve"
            ? "Approved — click Verify to publish"
            : action === "reject"
              ? "Rejected"
              : "Saved"
      );
      load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <BrandLoading fullPage message="Loading student submissions…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student job submissions</h1>
        <p className="text-slate-500">Approve, edit, then Verify to publish on the placement board.</p>
      </div>

      <div className="space-y-4">
        {jobs.map((j) => (
          <Card key={j.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {j.title} · {j.company}
                  </p>
                  <p className="text-xs text-indigo-600">
                    {j.reviewStatus} · {j.viewCount} views · {j.applyCount} applies
                  </p>
                  {j.submittedBy ? (
                    <p className="text-xs text-slate-500">
                      By {j.submittedBy.name} ({j.submittedBy.email})
                    </p>
                  ) : null}
                </div>
              </div>

              {editing[j.id] ? (
                <JobPostingFormFields
                  form={editing[j.id]!}
                  setForm={(next) => setEditing((prev) => ({ ...prev, [j.id]: next }))}
                  idPrefix={`admin-${j.id}`}
                />
              ) : null}

              <div>
                <Label htmlFor={`note-${j.id}`}>Admin note (reject / internal)</Label>
                <Textarea
                  id={`note-${j.id}`}
                  rows={2}
                  value={notes[j.id] ?? j.adminReviewNote ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [j.id]: e.target.value }))}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busyId === j.id} onClick={() => void act(j.id, "save")}>
                  Save edits
                </Button>
                {j.reviewStatus === "PENDING" ? (
                  <Button size="sm" disabled={busyId === j.id} onClick={() => void act(j.id, "approve")}>
                    Approve
                  </Button>
                ) : null}
                {j.reviewStatus === "APPROVED" || j.reviewStatus === "PENDING" ? (
                  <Button size="sm" disabled={busyId === j.id} onClick={() => void act(j.id, "verify")}>
                    Verify & publish
                  </Button>
                ) : null}
                {j.reviewStatus !== "REJECTED" && j.reviewStatus !== "VERIFIED" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === j.id}
                    onClick={() => void act(j.id, "reject")}
                  >
                    Reject
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!jobs.length ? <p className="text-slate-500">No student submissions yet.</p> : null}
      </div>
    </div>
  );
}
