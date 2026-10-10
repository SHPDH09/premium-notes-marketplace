"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InvoicePageShell } from "@/components/invoice/invoice-page-shell";
import { verifyPhysicalPayment } from "@/lib/physical/verify-payment-client";
import type { InvoiceDocumentData } from "@/lib/invoice/types";

export default function PhysicalInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/physical-orders/${id}/invoice`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load invoice");
        setInvoice(null);
        setLoading(false);
        return;
      }

      let invoiceData = data.invoice as InvoiceDocumentData;
      if (invoiceData.paymentStatus === "PENDING") {
        await verifyPhysicalPayment({ physicalOrderId: id });
        const again = await fetch(`/api/physical-orders/${id}/invoice`, { credentials: "include" });
        const refreshed = await again.json();
        if (again.ok) invoiceData = refreshed.invoice;
      }

      setInvoice(invoiceData);
      setLoading(false);
    }
    void load();
  }, [id]);

  return <InvoicePageShell invoice={invoice} loading={loading} error={error} />;
}
