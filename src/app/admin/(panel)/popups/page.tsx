"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";
import { uploadAdminFileDirect } from "@/lib/direct-upload-client";
import {
  POPUP_PAGE_OPTIONS,
  POPUP_REPEAT_LABELS,
  type PopupPageId,
  type PopupSocialLink,
} from "@/lib/popups";

type PopupRow = {
  id: string;
  name: string;
  popupType: string;
  title: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  whatsappUrl: string | null;
  socialLinks: PopupSocialLink[];
  targetPages: PopupPageId[];
  validFrom: string | null;
  validUntil: string | null;
  repeatMode: string;
  sortOrder: number;
  status: string;
};

const emptySocial = (): PopupSocialLink => ({ type: "custom", label: "", url: "" });

export default function AdminPopupsPage() {
  const [items, setItems] = useState<PopupRow[]>([]);
  const [form, setForm] = useState({
    name: "",
    popupType: "TEXT" as "TEXT" | "IMAGE",
    title: "",
    bodyText: "",
    buttonLabel: "",
    buttonUrl: "",
    whatsappUrl: "",
    repeatMode: "REPEAT",
    sortOrder: "0",
    validFrom: "",
    validUntil: "",
    targetPages: [] as PopupPageId[],
    socialLinks: [emptySocial()] as PopupSocialLink[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/popups", { credentials: "include", cache: "no-store" });
    const data = await readJsonResponse<{ popups?: PopupRow[]; error?: string }>(res);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load popups");
      return;
    }
    setItems(data.popups ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function togglePage(id: PopupPageId) {
    setForm((f) => ({
      ...f,
      targetPages: f.targetPages.includes(id)
        ? f.targetPages.filter((x) => x !== id)
        : [...f.targetPages, id],
    }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.targetPages.length) {
      toast.error("Select at least one page");
      return;
    }

    let imageStorageKey: string | null = null;
    if (form.popupType === "IMAGE") {
      if (!imageFile) {
        toast.error("Upload an image for image popup");
        return;
      }
      const uploaded = await uploadAdminFileDirect(imageFile, "covers");
      if ("error" in uploaded) {
        toast.error(uploaded.error);
        return;
      }
      imageStorageKey = uploaded.key;
    }

    const socialLinks = form.socialLinks.filter((s) => s.url.trim());

    const res = await fetch("/api/admin/popups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        imageStorageKey,
        socialLinks,
        sortOrder: Number(form.sortOrder) || 0,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create popup");
      return;
    }
    toast.success("Popup created");
    setForm({
      name: "",
      popupType: "TEXT",
      title: "",
      bodyText: "",
      buttonLabel: "",
      buttonUrl: "",
      whatsappUrl: "",
      repeatMode: "REPEAT",
      sortOrder: "0",
      validFrom: "",
      validUntil: "",
      targetPages: [],
      socialLinks: [emptySocial()],
    });
    setImageFile(null);
    load();
  }

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/admin/popups/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this popup?")) return;
    await fetch(`/api/admin/popups/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website popups</h1>
        <p className="mt-1 text-sm text-slate-600">
          Text or image popups, page targeting, optional schedule, repeat rules, CTA button, WhatsApp &amp; social links.
        </p>
      </div>

      <form onSubmit={create} className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Internal name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="h-11 w-full rounded-xl border px-3 text-sm"
              value={form.popupType}
              onChange={(e) => setForm({ ...form, popupType: e.target.value as "TEXT" | "IMAGE" })}
            >
              <option value="TEXT">Text popup</option>
              <option value="IMAGE">Image popup</option>
            </select>
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Sort order (lower = first)</Label>
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
        </div>

        {form.popupType === "TEXT" ? (
          <div>
            <Label>Message</Label>
            <Textarea
              className="min-h-[100px]"
              value={form.bodyText}
              onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
              placeholder="Offer text, announcement…"
            />
          </div>
        ) : (
          <div>
            <Label>Popup image</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            <Textarea
              className="mt-2 min-h-[60px]"
              value={form.bodyText}
              onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
              placeholder="Optional caption under image"
            />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Button label</Label>
            <Input value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} placeholder="Shop now" />
          </div>
          <div>
            <Label>Button link</Label>
            <Input value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} placeholder="/notes or https://…" />
          </div>
          <div className="md:col-span-2">
            <Label>WhatsApp channel / group link</Label>
            <Input value={form.whatsappUrl} onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })} placeholder="https://whatsapp.com/channel/…" />
          </div>
        </div>

        <div>
          <Label>Social media links</Label>
          <div className="mt-2 space-y-2">
            {form.socialLinks.map((link, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <select
                  className="h-11 rounded-xl border px-2 text-sm"
                  value={link.type}
                  onChange={(e) => {
                    const next = [...form.socialLinks];
                    next[i] = { ...next[i], type: e.target.value as PopupSocialLink["type"] };
                    setForm({ ...form, socialLinks: next });
                  }}
                >
                  {["instagram", "facebook", "youtube", "telegram", "twitter", "linkedin", "whatsapp", "custom"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Input
                  className="min-w-[120px] flex-1"
                  placeholder="Label (optional)"
                  value={link.label ?? ""}
                  onChange={(e) => {
                    const next = [...form.socialLinks];
                    next[i] = { ...next[i], label: e.target.value };
                    setForm({ ...form, socialLinks: next });
                  }}
                />
                <Input
                  className="min-w-[180px] flex-[2]"
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => {
                    const next = [...form.socialLinks];
                    next[i] = { ...next[i], url: e.target.value };
                    setForm({ ...form, socialLinks: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      socialLinks: form.socialLinks.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, socialLinks: [...form.socialLinks, emptySocial()] })}>
              Add social link
            </Button>
          </div>
        </div>

        <div>
          <Label>Show on pages</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPUP_PAGE_OPTIONS.map((p) => (
              <label
                key={p.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                  form.targetPages.includes(p.id) ? "border-indigo-400 bg-indigo-50 text-indigo-800" : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={form.targetPages.includes(p.id)}
                  onChange={() => togglePage(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Valid from (optional)</Label>
            <Input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </div>
          <div>
            <Label>Valid until (optional)</Label>
            <Input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <div>
            <Label>Repeat behaviour</Label>
            <select
              className="h-11 w-full rounded-xl border px-3 text-sm"
              value={form.repeatMode}
              onChange={(e) => setForm({ ...form, repeatMode: e.target.value })}
            >
              {Object.entries(POPUP_REPEAT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit">Create popup</Button>
      </form>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Pages</th>
                <th className="px-3 py-2 text-left">Schedule</th>
                <th className="px-3 py-2 text-left">Repeat</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.popupType}</td>
                  <td className="px-3 py-2 max-w-xs text-xs text-slate-600">{p.targetPages.join(", ")}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.validFrom ? new Date(p.validFrom).toLocaleString() : "—"} →{" "}
                    {p.validUntil ? new Date(p.validUntil).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{POPUP_REPEAT_LABELS[p.repeatMode] ?? p.repeatMode}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleStatus(p.id, p.status)}>
                        Toggle
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="p-8 text-center text-slate-500">No popups yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
