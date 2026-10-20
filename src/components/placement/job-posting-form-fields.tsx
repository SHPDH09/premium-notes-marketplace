"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const JOB_APPLY_TYPES = ["EMAIL", "LINK", "WALK_IN", "CALL", "WHATSAPP"] as const;
export type JobApplyTypeOption = (typeof JOB_APPLY_TYPES)[number];

export type JobPostingFormState = {
  title: string;
  company: string;
  location: string;
  applyType: JobApplyTypeOption;
  description: string;
  applyEmail: string;
  applyUrl: string;
  applyPhone: string;
  walkInDetails: string;
};

export const emptyJobPostingForm = (): JobPostingFormState => ({
  title: "",
  company: "",
  location: "",
  applyType: "EMAIL",
  description: "",
  applyEmail: "",
  applyUrl: "",
  applyPhone: "",
  walkInDetails: "",
});

export function JobPostingFormFields({
  form,
  setForm,
  idPrefix = "",
}: {
  form: JobPostingFormState;
  setForm: (next: JobPostingFormState) => void;
  idPrefix?: string;
}) {
  const p = idPrefix ? `${idPrefix}-` : "";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor={`${p}title`}>Job title</Label>
        <Input
          id={`${p}title`}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor={`${p}company`}>Company</Label>
        <Input
          id={`${p}company`}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor={`${p}location`}>Location</Label>
        <Input
          id={`${p}location`}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor={`${p}applyType`}>Apply type</Label>
        <select
          id={`${p}applyType`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={form.applyType}
          onChange={(e) => setForm({ ...form, applyType: e.target.value as JobApplyTypeOption })}
        >
          {JOB_APPLY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`${p}description`}>Description</Label>
        <Textarea
          id={`${p}description`}
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      {form.applyType === "EMAIL" ? (
        <div>
          <Label htmlFor={`${p}applyEmail`}>Apply email</Label>
          <Input
            id={`${p}applyEmail`}
            type="email"
            value={form.applyEmail}
            onChange={(e) => setForm({ ...form, applyEmail: e.target.value })}
            required
          />
        </div>
      ) : null}
      {form.applyType === "LINK" ? (
        <div>
          <Label htmlFor={`${p}applyUrl`}>Apply URL</Label>
          <Input
            id={`${p}applyUrl`}
            type="url"
            value={form.applyUrl}
            onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
            required
          />
        </div>
      ) : null}
      {form.applyType === "CALL" || form.applyType === "WHATSAPP" ? (
        <div>
          <Label htmlFor={`${p}applyPhone`}>
            {form.applyType === "WHATSAPP" ? "WhatsApp number" : "Phone number"}
          </Label>
          <Input
            id={`${p}applyPhone`}
            type="tel"
            placeholder="+91 9876543210"
            value={form.applyPhone}
            onChange={(e) => setForm({ ...form, applyPhone: e.target.value })}
            required
          />
        </div>
      ) : null}
      {form.applyType === "WALK_IN" ? (
        <div className="md:col-span-2">
          <Label htmlFor={`${p}walkInDetails`}>Walk-in details</Label>
          <Textarea
            id={`${p}walkInDetails`}
            rows={3}
            value={form.walkInDetails}
            onChange={(e) => setForm({ ...form, walkInDetails: e.target.value })}
            required
          />
        </div>
      ) : null}
    </div>
  );
}

export function jobFormToPayload(form: JobPostingFormState) {
  return {
    title: form.title,
    company: form.company,
    location: form.location || null,
    applyType: form.applyType,
    description: form.description,
    applyEmail: form.applyEmail || null,
    applyUrl: form.applyUrl || null,
    applyPhone: form.applyPhone || null,
    walkInDetails: form.walkInDetails || null,
  };
}
