import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { brand } from "@/config/brand";
import { LEGAL_LAST_UPDATED, refundPolicyParagraphs } from "@/lib/legal/refund-policy-content";
import { PLATFORM_REFUND_FEE_PERCENT, REFUND_WINDOW_HOURS } from "@/lib/refund-policy";
import { Shield, FileText } from "lucide-react";
import { LegalDocumentChrome } from "@/components/legal/legal-document-chrome";

type NavItem = { id: string; label: string };

export function LegalPageShell({
  variant,
  title,
  subtitle,
  nav,
  children,
}: {
  variant: "privacy" | "terms";
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const Icon = variant === "privacy" ? Shield : FileText;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-indigo-50/40 to-slate-100 print:bg-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(139,92,246,0.1),transparent_45%)] print:hidden" />
      <div className="relative">
        <PublicNavbar />

        <header className="no-print mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm">
                <Icon className="h-3.5 w-3.5" />
                Official legal document
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-slate-600">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/privacy"
                className={`rounded-xl px-4 py-2 font-medium shadow-sm transition ${
                  variant === "privacy"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                }`}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className={`rounded-xl px-4 py-2 font-medium shadow-sm transition ${
                  variant === "terms"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                }`}
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 print:max-w-none print:px-0">
          {/* Premium branded frame */}
          <div
            id="legal-document"
            className="overflow-hidden rounded-[1.75rem] border-2 border-indigo-200/80 bg-white shadow-[0_25px_60px_-15px_rgba(79,70,229,0.25)] ring-1 ring-indigo-500/10 print:rounded-none print:border print:shadow-none"
          >
            <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 print:hidden" />
            <LegalDocumentChrome docTitle={title} lastUpdated={LEGAL_LAST_UPDATED} />

            <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
              <aside className="no-print hidden border-r border-slate-100 bg-slate-50/80 p-6 lg:block">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Contents</p>
                <nav className="space-y-1 text-sm">
                  {nav.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block rounded-lg px-3 py-2 text-slate-600 transition hover:bg-white hover:text-indigo-700 hover:shadow-sm"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 rounded-xl border border-indigo-100 bg-white p-4 text-xs text-slate-500">
                  <p className="font-semibold text-slate-800">Contact</p>
                  <a href={`mailto:${brand.supportEmail}`} className="mt-1 block break-all text-indigo-600">
                    {brand.supportEmail}
                  </a>
                </div>
              </aside>

              <div className="space-y-6 p-6 sm:p-8 lg:p-10">{children}</div>
            </div>

            <div className="border-t border-indigo-100 bg-gradient-to-r from-slate-50 to-indigo-50/50 px-6 py-4 text-center text-xs text-slate-500 sm:px-8">
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </div>
          </div>
        </div>

        <div className="no-print">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100 print:break-inside-avoid print:shadow-none"
    >
      {title ? (
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <span className="h-8 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          {title}
        </h2>
      ) : null}
      <div
        className={`prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-indigo-600 ${title ? "mt-4" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

export function RefundHighlightCard() {
  return (
    <div
      id="refunds"
      className="scroll-mt-28 overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-md ring-1 ring-amber-100 sm:p-8 print:break-inside-avoid"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
          Refund policy
        </span>
        <span className="text-xs font-medium text-amber-700/80">{brand.name}</span>
      </div>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">{refundPolicyParagraphs.headline}</h2>
      <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
        <li className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            ✓
          </span>
          <span>
            <strong>Within {REFUND_WINDOW_HOURS} hours:</strong> If you complain after payment, an approved refund
            returns your money <strong>after deducting {PLATFORM_REFUND_FEE_PERCENT}% platform fee</strong>.
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50/80 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
            ✕
          </span>
          <span>
            <strong>After {REFUND_WINDOW_HOURS} hours:</strong> No refund will be issued for digital note purchases.
          </span>
        </li>
        <li className="rounded-xl border border-amber-200 bg-white/80 px-4 py-3 text-amber-950">
          Example: ₹1,000 paid → up to ₹{(1000 * (1 - PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} refunded; ₹
          {(1000 * (PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} platform fee (within {REFUND_WINDOW_HOURS}h only).
        </li>
      </ul>
      <p className="mt-6 text-sm text-slate-600">{refundPolicyParagraphs.howToRequest}</p>
      <p className="mt-2 text-sm font-medium text-indigo-700">
        <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
      </p>
    </div>
  );
}
