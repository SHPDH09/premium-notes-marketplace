import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { brand } from "@/config/brand";
import { LEGAL_LAST_UPDATED, refundPolicyParagraphs } from "@/lib/legal/refund-policy-content";
import { PLATFORM_REFUND_FEE_PERCENT, REFUND_WINDOW_HOURS } from "@/lib/refund-policy";
import { Shield, FileText } from "lucide-react";

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.2),transparent_50%)]" />
      <div className="relative">
        <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <PublicNavbar />
        </div>

        <header className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 lg:pt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                <Icon className="h-3.5 w-3.5" />
                {variant === "privacy" ? "Privacy" : "Terms"}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">{subtitle}</p>
              <p className="mt-3 text-sm text-slate-500">
                {brand.name} · Last updated {LEGAL_LAST_UPDATED}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/privacy"
                className={`rounded-xl px-4 py-2 font-medium transition ${
                  variant === "privacy"
                    ? "bg-white text-slate-900"
                    : "border border-white/20 text-slate-200 hover:bg-white/10"
                }`}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className={`rounded-xl px-4 py-2 font-medium transition ${
                  variant === "terms"
                    ? "bg-white text-slate-900"
                    : "border border-white/20 text-slate-200 hover:bg-white/10"
                }`}
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm backdrop-blur-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
              {nav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-8">{children}</div>
        </div>

        <div className="border-t border-white/10 bg-slate-950">
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
      className="scroll-mt-28 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8"
    >
      {title ? <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2> : null}
      <div
        className={`prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-indigo-300 hover:prose-a:text-indigo-200 ${title ? "mt-4" : ""}`}
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
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-slate-900/50 p-6 sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-amber-200/90">Refund policy</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{refundPolicyParagraphs.headline}</h2>
      <ul className="mt-6 space-y-4 text-sm leading-relaxed text-amber-50/95 sm:text-base">
        <li className="flex gap-3">
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
            ✓
          </span>
          <span>
            <strong className="text-white">Within {REFUND_WINDOW_HOURS} hours:</strong> If you complain after
            payment, an approved refund returns your money <strong>after deducting {PLATFORM_REFUND_FEE_PERCENT}%
            platform fee</strong>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-300">
            ✕
          </span>
          <span>
            <strong className="text-white">After {REFUND_WINDOW_HOURS} hours:</strong> No refund will be
            issued for digital note purchases.
          </span>
        </li>
        <li className="rounded-xl bg-black/20 px-4 py-3 text-amber-100/90">
          Example: ₹1,000 paid → up to ₹{(1000 * (1 - PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} refunded;
          ₹{(1000 * (PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} retained as platform fee (within{" "}
          {REFUND_WINDOW_HOURS}h window only).
        </li>
      </ul>
      <p className="mt-6 text-sm text-slate-400">{refundPolicyParagraphs.howToRequest}</p>
      <p className="mt-2 text-sm">
        <a href={`mailto:${brand.supportEmail}`} className="font-medium text-indigo-300 hover:underline">
          {brand.supportEmail}
        </a>
      </p>
    </div>
  );
}
