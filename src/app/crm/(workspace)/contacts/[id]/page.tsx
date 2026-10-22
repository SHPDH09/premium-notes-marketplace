"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CallActionButton } from "@/components/crm/call-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const [contact, setContact] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    const cRes = await fetch(`/api/crm/contacts/${params.id}`, { credentials: "include" });
    const cData = await cRes.json();
    if (!cRes.ok) {
      toast.error(cData.error ?? "Contact not found");
      return;
    }
    setContact(cData.contact);
    setForm({
      name: cData.contact.name ?? "",
      phone: cData.contact.phone ?? "",
      email: cData.contact.email ?? "",
      companyName: cData.contact.companyName ?? "",
      notes: cData.contact.notes ?? "",
    });
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function save() {
    const res = await fetch(`/api/crm/contacts/${params.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success("Contact updated");
    setEditing(false);
    void load();
  }

  if (!contact) {
    return <div className="p-6 text-slate-400">Loading contact…</div>;
  }

  const conversations = (contact.conversations as Record<string, unknown>[]) ?? [];
  const primaryConv = conversations[0] as { id?: string } | undefined;
  const consent = contact.consent as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/crm/contacts" className="text-sm text-emerald-400 hover:underline">
            ← Contacts
          </Link>
          <h1 className="text-2xl font-bold text-white">{String(contact.name ?? "Contact")}</h1>
          <p className="text-sm text-slate-400">{String(contact.phone)}</p>
        </div>
        <div className="flex gap-2">
          <CallActionButton contactId={params.id} phone={String(contact.phone)} conversationId={primaryConv?.id} />
          {primaryConv?.id ? (
            <Button asChild>
              <Link href={`/crm/inbox?conversation=${primaryConv.id}`}>Open chat</Link>
            </Button>
          ) : (
            <Button disabled variant="outline" title="Start a chat from WhatsApp inbound or outbound send">
              No conversation yet
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancel edit" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-emerald-400">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            {editing ? (
              <>
                {(["name", "phone", "email", "companyName"] as const).map((k) => (
                  <div key={k}>
                    <label className="text-xs text-slate-500">{k}</label>
                    <Input
                      className="mt-1 border-slate-700 bg-slate-950"
                      value={form[k] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-slate-500">Notes</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <Button onClick={() => void save()}>Save changes</Button>
              </>
            ) : (
              <>
                <p>Email: {String(contact.email ?? "—")}</p>
                <p>Company: {String(contact.companyName ?? "—")}</p>
                <p>Source: {String(contact.source ?? "—")}</p>
                <p>Status: {String(contact.status)}</p>
                <p>Agent: {(contact.assignedAgent as { name?: string } | null)?.name ?? "—"}</p>
                <p>Created: {new Date(String(contact.createdAt)).toLocaleString()}</p>
                <p>Last activity: {new Date(String(contact.lastActivityAt)).toLocaleString()}</p>
                {contact.notes ? <p className="whitespace-pre-wrap text-slate-400">{String(contact.notes)}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-emerald-400">Consent & opt-out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-300">
            <p>Marketing consent: {consent?.marketingConsent ? "Yes" : "No"}</p>
            <p>Consent source: {String(consent?.consentSource ?? "—")}</p>
            <p>Opted out: {consent?.optedOutAt ? String(consent.optedOutAt) : "No"}</p>
            <p className="pt-2 text-xs text-slate-500">
              STOP / unsubscribe keywords on WhatsApp automatically mark opt-out.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Tags</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {((contact.tags as { id: string; name: string; color: string }[]) ?? []).map((t) => (
            <span key={t.id} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
              {t.name}
            </span>
          ))}
          {!((contact.tags as unknown[]) ?? []).length ? (
            <span className="text-sm text-slate-500">No tags</span>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Recent calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {((contact.recentCalls as Record<string, unknown>[]) ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No call history linked to this contact yet.</p>
          ) : (
            ((contact.recentCalls as Record<string, unknown>[]) ?? []).map((call) => (
              <div key={String(call.id)} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-200">
                    {String(call.direction)} · {String(call.status)}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(String(call.startedAt)).toLocaleString()}</p>
                </div>
                <Link href="/crm/calls" className="text-xs text-emerald-400 hover:underline">
                  View in Calls
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-500">No WhatsApp conversations linked yet.</p>
          ) : (
            conversations.map((cv) => (
              <div key={String(cv.id)} className="rounded-lg border border-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">Status: {String(cv.status)}</p>
                  <Link href={`/crm/inbox?conversation=${String(cv.id)}`} className="text-sm text-emerald-400">
                    Open in inbox
                  </Link>
                </div>
                <p className="text-xs text-slate-500">{String(cv.lastMessagePreview ?? "")}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {((cv.recentMessages as Record<string, unknown>[]) ?? []).map((m) => (
                    <li key={String(m.id)}>
                      [{String(m.direction)}] {String(m.bodyText ?? "").slice(0, 120)} ·{" "}
                      {new Date(String(m.sentAt)).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {contact.campaignNote ? (
        <p className="text-xs text-slate-500">{String(contact.campaignNote)}</p>
      ) : null}
    </div>
  );
}
