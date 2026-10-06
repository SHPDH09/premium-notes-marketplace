import Link from "next/link";
import { brand } from "@/config/brand";
import {
  LegalPageShell,
  LegalSection,
  RefundHighlightCard,
} from "@/components/legal/legal-page-shell";
import { refundPolicyParagraphs } from "@/lib/legal/refund-policy-content";
import { REFUND_WINDOW_HOURS, PLATFORM_REFUND_FEE_PERCENT } from "@/lib/refund-policy";

export const metadata = {
  title: `Terms & Conditions | ${brand.name}`,
  description: `Terms of use and refund rules for ${brand.name}.`,
};

const nav = [
  { id: "agreement", label: "Agreement" },
  { id: "service", label: "Service" },
  { id: "accounts", label: "Accounts" },
  { id: "digital", label: "Digital goods" },
  { id: "payments", label: "Payments" },
  { id: "refunds", label: "Refunds" },
  { id: "ip", label: "Intellectual property" },
  { id: "conduct", label: "Acceptable use" },
  { id: "liability", label: "Liability" },
  { id: "law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      variant="terms"
      title="Terms & Conditions"
      subtitle="Rules for using our marketplace, buying notes, and requesting refunds."
      nav={nav}
    >
      <LegalSection id="agreement">
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of {brand.name} and purchases of digital
          study notes. By registering, browsing, or clicking &ldquo;Pay&rdquo; / &ldquo;Checkout&rdquo; after
          accepting these Terms and our <Link href="/privacy">Privacy Policy</Link>, you enter a binding agreement
          with us.
        </p>
      </LegalSection>

      <LegalSection id="service">
        <p>
          We provide an online platform where students can purchase access to PDF notes and related digital content.
          We may update features, pricing, or availability at any time. Descriptions and previews are for information;
          the licensed product is the digital file unlocked after successful payment.
        </p>
      </LegalSection>

      <LegalSection id="accounts">
        <ul>
          <li>You must provide accurate registration information and keep your password confidential.</li>
          <li>One account must not be shared to circumvent purchase or access controls.</li>
          <li>We may suspend or disable accounts that violate these Terms or applicable law.</li>
        </ul>
      </LegalSection>

      <LegalSection id="digital">
        <p>
          Notes are <strong>digital goods</strong>. Upon successful payment you receive a personal, non-transferable
          license to access the purchased content for your own study. You may not resell, redistribute, or publicly
          share paid PDFs unless we give written permission.
        </p>
      </LegalSection>

      <LegalSection id="payments">
        <p>
          All amounts are shown in INR unless stated otherwise. You agree to pay the total shown at checkout,
          including applicable discounts. Failed or reversed payments do not grant access until successfully
          completed.
        </p>
      </LegalSection>

      <RefundHighlightCard />

      <LegalSection id="refunds-terms">
        <h3 className="!mt-0 text-lg font-semibold text-white">Refund terms (summary)</h3>
        <ol>
          <li>
            If you <strong>complain or request a refund within {REFUND_WINDOW_HOURS} hours</strong> of successful
            payment, we may approve it after review.
          </li>
          <li>
            On every approved refund, <strong>{PLATFORM_REFUND_FEE_PERCENT}% platform fee</strong> is deducted from
            the order value; the <strong>balance is refunded</strong> to your original payment method.
          </li>
          <li>
            <strong>After {REFUND_WINDOW_HOURS} hours</strong> from successful payment, <strong>no refund</strong>{" "}
            will be issued — all sales are final.
          </li>
          <li>{refundPolicyParagraphs.partialRefunds}</li>
          <li>
            Contact: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> with transaction ID and
            reason.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="ip">
        <p>
          All notes, branding, and platform content remain the property of {brand.name} or respective content owners.
          Your license is limited to personal use as described above.
        </p>
      </LegalSection>

      <LegalSection id="conduct">
        <p>You agree not to:</p>
        <ul>
          <li>Upload malware, scrape the site abusively, or attempt unauthorized access.</li>
          <li>Use stolen payment methods or chargeback fraudulently outside these refund rules.</li>
          <li>Share login credentials or bulk-download content for redistribution.</li>
        </ul>
      </LegalSection>

      <LegalSection id="liability">
        <p>
          The service is provided &ldquo;as is&rdquo; to the maximum extent permitted by law. We are not liable for
          indirect or consequential damages. Our total liability for any claim relating to an order is limited to the
          amount you paid for that order.
        </p>
      </LegalSection>

      <LegalSection id="law">
        <p>
          These Terms are governed by the laws of India. Courts at our principal place of business shall have
          jurisdiction, subject to mandatory consumer protection laws that apply to you.
        </p>
        <p>We may update these Terms; continued use after changes constitutes acceptance. Check the &ldquo;Last updated&rdquo; date on our legal pages.</p>
      </LegalSection>

      <LegalSection id="contact">
        <p>
          Questions: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
        </p>
        <p className="text-slate-400">
          <Link href="/privacy">Privacy Policy</Link> · <Link href="/">Home</Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
