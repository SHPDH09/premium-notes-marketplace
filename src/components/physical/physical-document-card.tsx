"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/api/fetch-json";

export type PublicPhysicalDocument = {
  id: string;
  title: string;
  name: string;
  description: string;
  coverImage: string | null;
  finalPrice: number;
  pageCount: number | null;
  paperType: string;
  printType: string;
  bindingType: string;
  minQuantity: number;
  maxQuantity: number;
  noteDiscountPercentage?: number;
  compareDigitalPrice?: number | null;
  purchaseCount?: number;
  sourceNoteId?: string | null;
};

export function PhysicalDocumentCard({
  doc,
  quantity,
  onQuantityChange,
}: {
  doc: PublicPhysicalDocument;
  quantity: number;
  onQuantityChange: (q: number) => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  async function addToCart(buyNow = false) {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/physical-documents")}`);
      return;
    }
    const res = await fetch("/api/physical-cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ physicalDocumentId: doc.id, quantity }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Could not add");
    toast.success("Added to physical cart");
    if (buyNow) router.push("/physical-cart");
  }

  const badgeDiscount = doc.noteDiscountPercentage ?? 0;

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50">
        {doc.coverImage ? (
          <Image
            src={doc.coverImage}
            alt={doc.title}
            fill
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-indigo-300">No cover</div>
        )}
        {badgeDiscount > 0 && (
          <Badge className="absolute left-3 top-3">{badgeDiscount}% OFF digital</Badge>
        )}
        <Badge className="absolute right-3 top-3 bg-white/90 text-indigo-700">Printed copy</Badge>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{doc.name}</p>
          <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{doc.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{doc.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {doc.pageCount != null && (
            <span className="font-medium text-slate-700">{doc.pageCount} total pages</span>
          )}
          {doc.purchaseCount != null && doc.purchaseCount > 0 && (
            <span>{doc.purchaseCount} digital sales</span>
          )}
          <span>{doc.paperType.replace("_", " ")}</span>
          <span>{doc.printType.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-bold text-indigo-600">{formatCurrency(doc.finalPrice)}</span>
          <span className="text-sm text-slate-500">/ copy</span>
          {doc.compareDigitalPrice != null && doc.compareDigitalPrice !== doc.finalPrice && (
            <span className="text-sm text-slate-400">
              Digital {formatCurrency(doc.compareDigitalPrice)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Qty</label>
          <Input
            type="number"
            min={doc.minQuantity}
            max={doc.maxQuantity}
            className="h-9 w-20"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || doc.minQuantity)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/physical-documents/${doc.id}`}>View Details</Link>
          </Button>
          {doc.sourceNoteId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/notes/${doc.sourceNoteId}`}>Digital note</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void addToCart(false)}>
            Add to Cart
          </Button>
          <Button size="sm" onClick={() => void addToCart(true)}>
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
