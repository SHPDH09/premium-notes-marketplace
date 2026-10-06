"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { NotePreviewPanel } from "@/components/notes/note-preview-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((d) => setNote(d.note));
  }, [id]);

  async function payAndUnlock() {
    if (!session) {
      router.push(`/login?callbackUrl=/notes/${id}/payment`);
      return;
    }
    if (note?.owned) {
      router.push("/purchases");
      return;
    }

    setPaying(true);
    const prep = await fetch("/api/cart/buy-now", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: id }),
    });
    const prepData = await prep.json().catch(() => ({}));
    if (!prep.ok) {
      setPaying(false);
      toast.error(prepData.error ?? "Could not start checkout");
      return;
    }

    const res = await fetch("/api/checkout", { method: "POST", credentials: "include" });
    const data = await res.json();
    setPaying(false);

    if (!res.ok) {
      toast.error(data.error ?? "Payment could not start");
      return;
    }

    if (data.free) {
      toast.success("Note unlocked!");
      router.push(`/checkout/success?order_id=${data.orderId}`);
      return;
    }

    router.push(`/checkout/pay?session=${encodeURIComponent(data.paymentSessionId)}&order=${data.orderId}`);
  }

  if (!note) {
    return (
      <div>
        <PublicNavbar />
        <Skeleton className="mx-auto mt-10 h-96 max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <p className="text-sm font-medium text-indigo-600">Secure unlock</p>
          <h1 className="text-2xl font-bold text-slate-900">{note.title}</h1>
          <p className="mt-1 text-slate-600">
            First {note.freePreviewPages ?? 2} pages are free. Complete payment to unlock all pages permanently.
          </p>
        </div>

        <NotePreviewPanel noteId={id} />

        <Card>
          <CardHeader>
            <CardTitle>Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-indigo-600">{formatCurrency(note.finalPrice)}</span>
            </div>
            <ul className="list-inside list-disc text-sm text-slate-600">
              <li>Instant access to full PDF after successful payment</li>
              <li>No duplicate charges — owned forever in your library</li>
              <li>Prices verified server-side (secure checkout)</li>
            </ul>
            {note.owned ? (
              <Button asChild className="w-full">
                <Link href="/purchases">Already unlocked — open notes</Link>
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled={paying} onClick={payAndUnlock}>
                {paying ? "Processing..." : `Pay & unlock — ${formatCurrency(note.finalPrice)}`}
              </Button>
            )}
            <Button variant="ghost" asChild className="w-full">
              <Link href={`/notes/${id}`}>Back to note details</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
