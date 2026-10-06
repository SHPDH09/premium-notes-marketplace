import Link from "next/link";
import { brand } from "@/config/brand";
import {
  LegalPageShell,
  LegalSection,
  RefundHighlightCard,
} from "@/components/legal/legal-page-shell";
import { refundPolicyParagraphs } from "@/lib/legal/refund-policy-content";

export const metadata = {
  title: `Privacy Policy | ${brand.name}`,
  description: `Privacy Policy for ${brand.name} — data, payments, and refund rules.`,
};

const nav = [
  { id: "intro", label: "Introduction" },
  { id: "data", label: "Data we collect" },
  { id: "use", label: "How we use data" },
  { id: "payments", label: "Payments" },
  { id: "refunds", label: "Refunds" },
  { id: "sharing", label: "Sharing" },
  { id: "rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      variant="privacy"
      title="Privacy Policy"
      subtitle="How we protect your data when you learn with us — and how refunds work for digital notes."
      nav={nav}
    >
      <LegalSection id="intro">
        <p>
          {brand.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates {brand.supportEmail} and this website to sell
          digital study notes. This Privacy Policy explains what personal data we collect, why we use it, and your
          choices. By creating an account or making a payment, you also agree to our{" "}
          <Link href="/terms">Terms &amp; Conditions</Link>.
        </p>
      </LegalSection>

      <LegalSection id="data">
        <ul>
          <li>
            <strong>Account data:</strong> name, email, optional phone, password (stored securely hashed).
          </li>
          <li>
            <strong>Profile:</strong> optional profile photo and dashboard preferences.
          </li>
          <li>
            <strong>Transactions:</strong> notes purchased, amounts, coupons, payment and refund status.
          </li>
          <li>
            <strong>Technical:</strong> IP address, browser/device data, session cookies for login and security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use">
        <ul>
          <li>Deliver purchased notes and manage your student library.</li>
          <li>Process payments and refunds through our payment partner.</li>
          <li>Respond to support requests and complaints (including refund requests within the 12-hour window).</li>
          <li>Prevent fraud, abuse, and unauthorized sharing of paid content.</li>
          <li>Improve platform performance and user experience.</li>
        </ul>
      </LegalSection>

      <LegalSection id="payments">
        <p>
          Payments are processed by <strong>Cashfree</strong> (or other gateways we enable). We do not store full
          card numbers or UPI PINs. Prices, discounts, and coupons are validated on our servers before checkout.
        </p>
        <p>
          When you pay, you must accept our Terms &amp; Conditions and this Privacy Policy at checkout — including
          the refund rules below.
        </p>
      </LegalSection>

      <RefundHighlightCard />

      <LegalSection id="refunds-detail">
        <p>{refundPolicyParagraphs.withinWindow}</p>
        <p>{refundPolicyParagraphs.afterWindow}</p>
        <p>{refundPolicyParagraphs.partialRefunds}</p>
        <p>{refundPolicyParagraphs.howToRequest}</p>
      </LegalSection>

      <LegalSection id="sharing">
        <p>
          We share data only with trusted providers (hosting, database, file storage, payment processing) under
          contracts that require them to protect your information. We do <strong>not</strong> sell your personal
          data.
        </p>
      </LegalSection>

      <LegalSection id="rights">
        <p>
          You may update your profile, change your password, or request deletion of your account by emailing{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. You may request a copy of personal data
          we hold about you, subject to verification.
        </p>
      </LegalSection>

      <LegalSection id="contact">
        <p>
          Privacy or refund questions:{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
        </p>
        <p className="text-slate-400">
          <Link href="/">← Back to home</Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
