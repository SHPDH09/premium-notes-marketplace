"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { BrandLoading } from "@/components/brand/brand-loading";
import { SiteFooter } from "@/components/layout/site-footer";
import { refundPolicyPaymentBullet } from "@/lib/refund-policy";
import { NotePreviewPanel } from "@/components/notes/note-preview-panel";

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<any>(null);
  const [physicalDocument, setPhysicalDocument] = useState<{ id: string; finalPrice: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setNote(d.note);
        setPhysicalDocument(d.physicalDocument ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/notes/${id}`)}`);
      return;
    }
    const res = await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: id }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Failed");
    toast.success("Added to cart");
  }

  function openNotes() {
    router.push(`/purchases/${id}/view`);
  }

  if (loading) {
    return (
      <div>
        <PublicNavbar />
        <BrandLoading fullPage size="lg" message="Loading note…" />
      </div>
    );
  }

  if (!note) {
    return (
      <div>
        <PublicNavbar />
        <p className="py-20 text-center">Note not found</p>
      </div>
    );
  }

  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100">
          {note.coverImage && <Image src={note.coverImage} alt={note.title} fill className="object-cover" />}
        </div>
        <div className="space-y-5">
          {note.discountPercentage > 0 && <Badge>{note.discountPercentage}% OFF</Badge>}
          <h1 className="text-3xl font-bold text-slate-900">{note.title}</h1>
          <p className="text-slate-600">{note.description}</p>
          <p className="text-xs text-slate-500">
            {refundPolicyPaymentBullet()}.{" "}
            <Link href="/privacy#refunds" className="font-medium text-indigo-600 hover:underline">
              Privacy &amp; refunds
            </Link>
          </p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-indigo-600">{formatCurrency(note.finalPrice)}</span>
            {note.price > note.finalPrice && (
              <span className="text-lg text-slate-400 line-through">{formatCurrency(note.price)}</span>
            )}
          </div>
          {physicalDocument && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="font-semibold text-indigo-900">Available as physical copy</p>
              <p className="mt-1 text-sm text-indigo-800">
                Printed &amp; delivered from {formatCurrency(physicalDocument.finalPrice)} per copy
              </p>
              <Button className="mt-3" variant="secondary" size="sm" asChild>
                <Link href={`/physical-documents/${physicalDocument.id}`}>Order printed copy</Link>
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {note.owned ? (
              <>
                <Badge variant="success">Already Purchased</Badge>
                <Button onClick={openNotes}>Open protected viewer</Button>
                <Button variant="secondary" asChild>
                  <Link href="/purchases">My Purchased Notes</Link>
                </Button>
              </>
            ) : (
              <>
                <Button onClick={addToCart}>Add to Cart</Button>
                <Button variant="outline" asChild>
                  <Link href={`/notes/${id}/payment`}>Pay & Unlock Full PDF</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={`/notes/${id}/payment`}>Buy Now</Link>
                </Button>
              </>
            )}
          </div>

          {(note.previewAvailable || note.hasPdf) && (
            <div className="lg:hidden">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Free preview</h2>
              <NotePreviewPanel noteId={id} compact />
            </div>
          )}
        </div>
      </div>

      {(note.previewAvailable || note.hasPdf) && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="mb-4 hidden text-xl font-bold text-slate-900 lg:block">Notes preview</h2>
          <div className="hidden lg:block">
            <NotePreviewPanel noteId={id} />
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
