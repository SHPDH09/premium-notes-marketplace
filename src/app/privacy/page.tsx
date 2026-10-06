import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { brand } from "@/config/brand";
import {
  PLATFORM_REFUND_FEE_PERCENT,
  REFUND_WINDOW_HOURS,
  refundPolicyShortText,
} from "@/lib/refund-policy";

export const metadata = {
  title: `Privacy Policy & Refunds | ${brand.name}`,
  description: `Privacy policy, payment terms, and refund rules for ${brand.name}.`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-indigo-600">Legal</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Privacy Policy &amp; payment terms</h1>
        <p className="mt-3 text-slate-600">
          Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
        </p>

        <article className="prose prose-slate mt-10 max-w-none prose-headings:font-semibold prose-a:text-indigo-600">
          <h2>1. Who we are</h2>
          <p>
            {brand.name} ({brand.supportEmail}) operates this website to sell digital study notes to
            registered students. By using our site, creating an account, or making a payment, you agree
            to this policy.
          </p>

          <h2>2. Information we collect</h2>
          <ul>
            <li>Account details: name, email, phone (optional), and password (stored hashed).</li>
            <li>Profile information you choose to upload (e.g. profile photo).</li>
            <li>Purchase history: notes bought, order amounts, coupons used, and payment status.</li>
            <li>Technical data: browser type, IP address, and cookies required for login and security.</li>
          </ul>

          <h2>3. How we use your information</h2>
          <ul>
            <li>To provide access to purchased notes and your student dashboard.</li>
            <li>To process payments through our payment partner (Cashfree).</li>
            <li>To send service-related communication (e.g. purchase confirmation, refund updates).</li>
            <li>To prevent fraud, enforce our terms, and improve the platform.</li>
          </ul>

          <h2>4. Payments</h2>
          <p>
            Payments are processed securely by Cashfree. We do not store your full card or UPI credentials
            on our servers. Order totals and discounts are calculated on our servers before checkout.
          </p>

          <h2 id="refunds">5. Refund policy (digital notes)</h2>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 not-prose">
            <strong>Important:</strong> {refundPolicyShortText()}
          </p>
          <ul>
            <li>
              <strong>Time limit:</strong> Refund requests are accepted only within{" "}
              <strong>{REFUND_WINDOW_HOURS} hours</strong> of successful payment. After that window,
              digital note purchases are <strong>non-refundable</strong>.
            </li>
            <li>
              <strong>Platform charge:</strong> On every approved refund, we deduct a{" "}
              <strong>{PLATFORM_REFUND_FEE_PERCENT}%</strong> platform charge from the order value.
              Only the amount <strong>after</strong> this deduction is returned to your original payment
              method.
            </li>
            <li>
              <strong>Example:</strong> If you paid ₹1,000 and qualify for a full refund within{" "}
              {REFUND_WINDOW_HOURS} hours, the platform charge is ₹
              {(1000 * (PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} and up to ₹
              {(1000 * (1 - PLATFORM_REFUND_FEE_PERCENT / 100)).toFixed(0)} may be refunded to you.
            </li>
            <li>
              <strong>Access:</strong> Partial refunds may keep note access until the refundable balance
              is fully used. A full refund under this policy closes the order and removes access to the
              affected notes.
            </li>
            <li>
              To request a refund within the eligible period, email{" "}
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> with your transaction ID.
              Approved refunds are processed by our team through the payment gateway.
            </li>
          </ul>

          <h2>6. Data sharing</h2>
          <p>
            We share data only with service providers needed to run the platform (hosting, database,
            storage, payment processing) under appropriate agreements. We do not sell your personal
            information.
          </p>

          <h2>7. Data retention</h2>
          <p>
            We retain account and transaction records as long as your account is active and as required
            for tax, legal, and dispute resolution purposes.
          </p>

          <h2>8. Your rights</h2>
          <p>
            You may update your profile, change your password, or request account deletion by contacting{" "}
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. You may also ask for a
            copy of personal data we hold about you.
          </p>

          <h2>9. Contact</h2>
          <p>
            Questions about privacy or refunds:{" "}
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
          </p>
        </article>

        <p className="mt-10 text-sm text-slate-500">
          <Link href="/" className="text-indigo-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
