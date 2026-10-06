import Link from "next/link";
import { refundPolicyShortText } from "@/lib/refund-policy";

export function PolicyNotice() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">Privacy &amp; refund policy</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{refundPolicyShortText()}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm font-semibold">
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy →
          </Link>
          <Link href="/terms" className="text-indigo-600 hover:underline">
            Terms &amp; Conditions →
          </Link>
        </div>
      </div>
    </section>
  );
}
