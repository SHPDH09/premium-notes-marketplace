"use client";

import Image from "next/image";
import { brand } from "@/config/brand";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceDocumentData } from "@/lib/invoice/types";
import { cn } from "@/lib/utils";

function paymentStatusLabel(status: string) {
  switch (status) {
    case "SUCCESS":
      return "Paid";
    case "PENDING":
      return "Payment pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    default:
      return status;
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PremiumInvoiceDocument({
  invoice,
  className,
}: {
  invoice: InvoiceDocumentData;
  className?: string;
}) {
  const kindLabel = invoice.kind === "digital" ? "Digital notes" : "Physical print order";

  return (
    <article
      className={cn(
        "mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 print:max-w-none print:rounded-none print:border-0 print:shadow-none",
        className
      )}
    >
      <header className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-8 py-8 text-white print:px-6 print:py-6">
        <div className="absolute inset-0 opacity-20 print:hidden">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-300/40 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex rounded-xl border border-white/20 bg-white px-3 py-2 shadow-lg">
              <Image
                src={brand.logoSrc}
                alt={brand.name}
                width={168}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm font-medium text-indigo-100">{brand.tagline}</p>
            <p className="text-xs text-indigo-100/90">
              {brand.website} · {brand.supportEmail}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">
              Tax invoice / receipt
            </p>
            <p className="mt-1 font-mono text-lg font-bold">{invoice.invoiceNumber}</p>
            <p className="mt-2 text-sm text-indigo-100">{kindLabel}</p>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-8 py-8 print:space-y-6 print:px-6 print:py-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 print:bg-white">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Seller
            </h2>
            <p className="mt-2 font-semibold text-slate-900">{brand.legalName}</p>
            <p className="text-sm text-slate-600">Place of supply: {brand.placeOfSupply}</p>
            <p className="text-sm text-slate-600">Support: {brand.supportEmail}</p>
          </section>
          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 print:bg-white">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Invoice details
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Invoice date</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(invoice.issuedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Order reference</dt>
                <dd className="font-mono text-xs font-medium text-slate-900">
                  {invoice.orderReference}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Payment status</dt>
                <dd className="font-semibold text-emerald-700">
                  {paymentStatusLabel(invoice.paymentStatus)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bill to
            </h2>
            <p className="mt-2 font-semibold text-slate-900">{invoice.billTo.name}</p>
            <p className="text-sm text-slate-600">{invoice.billTo.email}</p>
            {invoice.billTo.phone ? (
              <p className="text-sm text-slate-600">{invoice.billTo.phone}</p>
            ) : null}
          </section>
          {invoice.shipTo ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ship to
              </h2>
              <p className="mt-2 font-semibold text-slate-900">{invoice.shipTo.fullName}</p>
              <p className="text-sm text-slate-600">
                {invoice.shipTo.addressLine1}
                {invoice.shipTo.addressLine2 ? `, ${invoice.shipTo.addressLine2}` : ""}
              </p>
              {invoice.shipTo.landmark ? (
                <p className="text-sm text-slate-600">{invoice.shipTo.landmark}</p>
              ) : null}
              <p className="text-sm text-slate-600">
                {invoice.shipTo.city}, {invoice.shipTo.state} — {invoice.shipTo.pincode}
              </p>
              <p className="text-sm text-slate-600">{invoice.shipTo.country}</p>
              {invoice.shipTo.phone ? (
                <p className="text-sm text-slate-600">Phone: {invoice.shipTo.phone}</p>
              ) : null}
            </section>
          ) : (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Delivery
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Digital delivery — access from{" "}
                <span className="font-medium text-slate-900">My Purchases</span> on your account.
              </p>
            </section>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit (INR)</th>
                <th className="px-4 py-3 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{line.description}</p>
                    {line.subtitle ? (
                      <p className="mt-0.5 text-xs text-slate-500">{line.subtitle}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{line.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <section className="max-w-md text-xs leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-700">Payment information</p>
            <p className="mt-1">
              Method: <span className="text-slate-800">{invoice.paymentMethod}</span>
            </p>
            {invoice.paymentReference ? (
              <p>
                Transaction / payment ID:{" "}
                <span className="font-mono text-slate-800">{invoice.paymentReference}</span>
              </p>
            ) : null}
            {invoice.gatewayOrderId ? (
              <p>
                Gateway order ID:{" "}
                <span className="font-mono text-slate-800">{invoice.gatewayOrderId}</span>
              </p>
            ) : null}
            {invoice.notes ? <p className="mt-3">{invoice.notes}</p> : null}
            <p className="mt-3">
              All amounts are in Indian Rupees (INR). This document serves as your official payment
              receipt and tax invoice for your records.
            </p>
          </section>

          <section className="w-full max-w-xs space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm print:bg-white">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Subtotal</span>
              <span className="tabular-nums font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 ? (
              <div className="flex justify-between gap-4 text-emerald-700">
                <span>Item discount</span>
                <span className="tabular-nums">−{formatCurrency(invoice.discount)}</span>
              </div>
            ) : null}
            {invoice.couponDiscount > 0 ? (
              <div className="flex justify-between gap-4 text-emerald-700">
                <span>Coupon{invoice.couponCode ? ` (${invoice.couponCode})` : ""}</span>
                <span className="tabular-nums">−{formatCurrency(invoice.couponDiscount)}</span>
              </div>
            ) : null}
            {invoice.deliveryCharge > 0 ? (
              <div className="flex justify-between gap-4">
                <span className="text-slate-600">Delivery</span>
                <span className="tabular-nums">{formatCurrency(invoice.deliveryCharge)}</span>
              </div>
            ) : null}
            {invoice.refundedAmount > 0 ? (
              <div className="flex justify-between gap-4 text-amber-800">
                <span>Refunded</span>
                <span className="tabular-nums">−{formatCurrency(invoice.refundedAmount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-indigo-200 pt-3 text-base">
              <span className="font-semibold text-slate-900">Total paid</span>
              <span className="font-bold tabular-nums text-indigo-700">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
          <p>Thank you for learning with {brand.name}.</p>
          <p className="mt-1">
            Questions about this invoice? Email{" "}
            <a href={`mailto:${brand.supportEmail}`} className="text-indigo-600">
              {brand.supportEmail}
            </a>
          </p>
        </footer>
      </div>
    </article>
  );
}
