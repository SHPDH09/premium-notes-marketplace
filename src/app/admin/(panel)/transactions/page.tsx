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
  canRefund: boolean;
  date: string;
};

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<TxRow[]>([]);
  const [q, setQ] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ orderId: string; text: string } | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await readJsonResponse<{ transactions?: TxRow[]; error?: string }>(res);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load transactions");
      return;
    }
    setItems(data.transactions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function refund(orderId: string) {
    const reason = window.prompt("Refund reason (optional, saved in admin note):");
    if (reason === null) return;
    setRefundingId(orderId);
    try {
      const res = await fetch(`/api/admin/transactions/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await readJsonResponse<{ error?: string; warning?: string }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "Refund failed");
        return;
      }
      toast.success("Transaction refunded — student access revoked");
      if (data.warning) toast.warning(data.warning);
      load();
    } finally {
      setRefundingId(null);
    }
  }

  async function saveAdminNote() {
    if (!noteDialog) return;
    const res = await fetch(`/api/admin/transactions/${noteDialog.orderId}`, {
      method: "PATCH",
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
        <Button variant="outline" onClick={load}>
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
                  <td className="px-3 py-2">
                    <div>{t.noteName}</div>
                    {t.adminNote ? (
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
                            ? "text-amber-700"
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
                          <Link href={`/admin/notes/edit/${t.noteIds[0]}`}>Note</Link>
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
                        onClick={() => refund(t.orderId)}
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
                placeholder="Refund reason, support ticket ID, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteDialog(null)}>
                Cancel
              </Button>
              <Button onClick={saveAdminNote}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
