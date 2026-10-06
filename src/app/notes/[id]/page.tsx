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
import { Skeleton } from "@/components/ui/skeleton";
import { NotePreviewPanel } from "@/components/notes/note-preview-panel";

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((d) => setNote(d.note))
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

  async function openNotes() {
    const res = await fetch(`/api/purchases/${id}/access`);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Access denied");
    window.open(data.url, "_blank");
  }

  if (loading) {
    return (
      <div>
        <PublicNavbar />
        <Skeleton className="mx-auto mt-10 h-96 max-w-5xl" />
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
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-indigo-600">{formatCurrency(note.finalPrice)}</span>
            {note.price > note.finalPrice && (
              <span className="text-lg text-slate-400 line-through">{formatCurrency(note.price)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {note.owned ? (
              <>
                <Badge variant="success">Already Purchased</Badge>
                <Button onClick={openNotes}>Open Notes</Button>
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
        </div>
      </div>
      {note.previewAvailable && (
        <div className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Read preview</h2>
          <NotePreviewPanel noteId={id} />
        </div>
      )}
    </div>
  );
}
