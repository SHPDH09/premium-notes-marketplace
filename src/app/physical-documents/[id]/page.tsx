"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudentShell } from "@/components/layout/student-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";
import { readJsonResponse } from "@/lib/api/fetch-json";

function labelEnum(v: string) {
  return v.replace(/_/g, " ");
}

export default function PhysicalDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/physical-documents/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDoc(d.document);
        if (d.document?.minQuantity) setQuantity(d.document.minQuantity);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart(buyNow = false) {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/physical-documents/${id}`)}`);
      return;
    }
    const res = await fetch("/api/physical-cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ physicalDocumentId: id, quantity }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok) return toast.error(typeof data.error === "string" ? data.error : "Failed");
    toast.success("Added to cart");
    router.push(buyNow ? "/physical-cart" : "/physical-cart");
  }

  if (loading) {
    return (
      <StudentShell>
        <BrandLoading fullPage size="lg" message="Loading document…" />
      </StudentShell>
    );
  }

  if (!doc) {
    return (
      <StudentShell>
        <p className="py-20 text-center">Document not found</p>
      </StudentShell>
    );
  }

  const linked = doc.linkedNote;

  return (
    <StudentShell>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100">
          {doc.coverImage && (
            <Image src={doc.coverImage} alt={doc.title} fill className="object-cover" />
          )}
        </div>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge>Printed copy</Badge>
            {doc.noteDiscountPercentage > 0 && (
              <Badge variant="warning">{doc.noteDiscountPercentage}% OFF on digital</Badge>
            )}
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">{doc.name}</p>
          <h1 className="text-3xl font-bold text-slate-900">{doc.title}</h1>
          <p className="text-slate-600 whitespace-pre-wrap">{doc.description}</p>

          {linked && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">Also available digitally</p>
              <p className="mt-1 text-slate-600">
                PDF / online access: {formatCurrency(linked.finalPrice)}
                {linked.price > linked.finalPrice && (
                  <span className="ml-2 line-through text-slate-400">
                    {formatCurrency(linked.price)}
                  </span>
                )}
              </p>
              <Button variant="ghost" className="mt-1 h-auto px-0 text-indigo-600" asChild>
                <Link href={`/notes/${linked.id}`}>View digital note</Link>
              </Button>
            </div>
          )}

          <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {doc.pageCount != null && <li>Pages: {doc.pageCount}</li>}
            <li>Paper: {labelEnum(doc.paperSize)} · {labelEnum(doc.paperType)}</li>
            <li>Print: {labelEnum(doc.printType)}</li>
            <li>Binding: {labelEnum(doc.bindingType)}</li>
            <li>Processing: ~{doc.processingDays} days</li>
          </ul>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-indigo-600">
              {formatCurrency(doc.finalPrice)}
            </span>
            <span className="text-slate-500">per copy</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Quantity</label>
            <Input
              type="number"
              className="w-24"
              min={doc.minQuantity}
              max={doc.maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
            <span className="text-sm font-medium text-slate-700">
              Total {formatCurrency(doc.finalPrice * quantity)}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void addToCart(false)}>Add to Cart</Button>
            <Button variant="outline" onClick={() => void addToCart(true)}>
              Buy Now
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/physical-documents">Back to catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
