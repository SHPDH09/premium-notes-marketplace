"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/fetch-json";

type TxRow = {
  orderId: string;
  transactionId: string | null;
  studentName: string;
  noteName: string;
  noteIds: string[];
  coupon: string | null;
  finalAmount: number;
  paymentStatus: string;
  transactionStatus: string;
  adminNote: string | null;
  refundReason: string | null;
  canRefund: boolean;
  date: string;
};

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<TxRow[]>([]);
  const [q, setQ] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ orderId: string; text: string } | null>(null);
  const [refundDialog, setRefundDialog] = useState<{ orderId: string; reason: string } | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/transactions?${params}`, { credentials: "include", cache: "no-store" });
    const data = await readJsonResponse<{ transactions?: TxRow[]; error?: string }>(res);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load transactions");
      return;
    }
    setItems(data.transactions ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitRefund() {
    if (!refundDialog) return;
    const reason = refundDialog.reason.trim();
    if (!reason) {
      toast.error("Please enter a refund reason");
      return;
    }
    setRefundingId(refundDialog.orderId);
    try {
      const res = await fetch(`/api/admin/transactions/${refundDialog.orderId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await readJsonResponse<{ error?: string; warning?: string }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "Refund failed");
        return;
      }
      toast.success("Transaction refunded — reason saved");
      if (data.warning) toast.warning(data.warning);
      setRefundDialog(null);
      load();
    } finally {
      setRefundingId(null);
    }
  }

  async function saveAdminNote() {
    if (!noteDialog) return;
    const res = await fetch(`/api/admin/transactions/${noteDialog.orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: noteDialog.text }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save note");
      return;
    }
    toast.success("Admin note saved");
    setNoteDialog(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="flex gap-2">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => void load()}>
          Search
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Txn ID</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Coupon</th>
                <th className="px-3 py-2 text-left">Final</th>
                <th className="px-3 py-2 text-left">Payment</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.orderId} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{t.transactionId ?? "—"}</td>
                  <td className="px-3 py-2">{t.studentName}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="font-medium text-slate-900">{t.noteName}</div>
                    {t.refundReason ? (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                        <span className="font-semibold">Refund reason:</span> {t.refundReason}
                      </p>
                    ) : t.adminNote && t.paymentStatus !== "REFUNDED" ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500" title={t.adminNote}>
                        {t.adminNote}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{t.coupon ?? "-"}</td>
                  <td className="px-3 py-2">{formatCurrency(t.finalAmount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        t.paymentStatus === "SUCCESS"
                          ? "text-emerald-700"
                          : t.paymentStatus === "REFUNDED"
                            ? "text-amber-700 font-medium"
                            : ""
                      }
                    >
                      {t.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">{new Date(t.date).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {t.noteIds[0] ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/notes/edit/${t.noteIds[0]}`}>Open note</Link>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setNoteDialog({ orderId: t.orderId, text: t.adminNote ?? "" })
                        }
                      >
                        Admin note
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!t.canRefund || refundingId === t.orderId}
                        onClick={() => setRefundDialog({ orderId: t.orderId, reason: "" })}
                      >
                        {refundingId === t.orderId ? "Refunding…" : "Refund"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="p-8 text-center text-slate-500">No transactions found.</p>
          )}
        </CardContent>
      </Card>

      {refundDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Refund transaction</h2>
            <p className="text-sm text-slate-600">
              Reason will appear in the <strong>Note</strong> column for this transaction.
            </p>
            <div>
              <Label htmlFor="refund-reason">Refund reason</Label>
              <Textarea
                id="refund-reason"
                className="mt-1 min-h-[100px]"
                value={refundDialog.reason}
                onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
                placeholder="e.g. Duplicate payment, customer request, wrong note purchased"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundDialog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void submitRefund()}>
                Confirm refund
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {noteDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Transaction admin note</h2>
            <div>
              <Label htmlFor="admin-note">Note (internal)</Label>
              <Textarea
                id="admin-note"
                className="mt-1 min-h-[120px]"
                value={noteDialog.text}
                onChange={(e) => setNoteDialog({ ...noteDialog, text: e.target.value })}
                placeholder="Support ticket ID, follow-up, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteDialog(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveAdminNote()}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
