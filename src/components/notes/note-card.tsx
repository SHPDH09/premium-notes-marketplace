"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const NotePreviewPanel = dynamic(
  () => import("@/components/notes/note-preview-panel").then((m) => m.NotePreviewPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-slate-100" /> }
);

export type PublicNote = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  price: number;
  finalPrice: number;
  discountPercentage: number;
  owned?: boolean;
  previewAvailable?: boolean;
  freePreviewPages?: number;
};

export function NoteCard({
  note,
  showPdfPreview = false,
}: {
  note: PublicNote;
  showPdfPreview?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  async function addToCart() {
    if (!session) {
      router.push("/login");
      return;
    }
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not add to cart");
      return;
    }
    toast.success("Note added to cart");
  }

  async function buyNow() {
    await addToCart();
    router.push("/cart");
  }

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
        {note.coverImage ? (
          <Image src={note.coverImage} alt={note.title} fill className="object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-indigo-300">No cover</div>
        )}
        {note.discountPercentage > 0 && (
          <Badge className="absolute left-3 top-3">{note.discountPercentage}% OFF</Badge>
        )}
      </div>
      <CardContent className="space-y-4 p-5">
        {showPdfPreview && note.previewAvailable && !note.owned && (
          <NotePreviewPanel noteId={note.id} compact />
        )}
        <div>
          <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{note.title}</h3>
          {showPdfPreview && note.previewAvailable && !note.owned && (
            <p className="mt-1 text-xs font-medium text-indigo-600">
              {note.freePreviewPages ?? 2} pages free · rest locked until payment
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{note.description}</p>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-bold text-indigo-600">{formatCurrency(note.finalPrice)}</span>
          {note.price > note.finalPrice && (
            <span className="text-sm text-slate-400 line-through">{formatCurrency(note.price)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/notes/${note.id}`}>View Details</Link>
          </Button>
          {note.owned ? (
            <Button size="sm" asChild>
              <Link href="/purchases">Purchased</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={addToCart}>
                Add to Cart
              </Button>
              <Button size="sm" onClick={buyNow}>
                Buy Now
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
