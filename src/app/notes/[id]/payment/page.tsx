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
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { brand } from "@/config/brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { refundPolicyPaymentBullet } from "@/lib/refund-policy";

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
          <p className="text-sm font-medium text-indigo-600">Pay {brand.name}</p>
          <h1 className="text-2xl font-bold text-slate-900">{note.title}</h1>
          <p className="mt-1 text-slate-600">
            Complete payment to unlock the full PDF permanently in your library.
          </p>
        </div>

        {note.coverImage ? (
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Image src={note.coverImage} alt={note.title} fill className="object-cover" />
          </div>
        ) : null}

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
              <li>Payment to <strong>{brand.name}</strong> (secure Cashfree checkout)</li>
              <li>Instant access to full PDF after successful payment</li>
              <li>No duplicate charges — owned forever in your library</li>
              <li>Prices verified server-side (secure checkout)</li>
              <li>{refundPolicyPaymentBullet()}</li>
            </ul>
            <p className="text-xs text-slate-500">
              By paying, you agree to our{" "}
              <Link href="/privacy" className="font-medium text-indigo-600 hover:underline">
                Privacy Policy &amp; refund terms
              </Link>
              .
            </p>
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
      <SiteFooter />
    </div>
  );
}
