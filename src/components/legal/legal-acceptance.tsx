"use client";

import Link from "next/link";

type LegalAcceptanceProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  id?: string;
};

export function LegalAcceptance({
  checked,
  onCheckedChange,
  disabled,
  id = "accept-legal",
}: LegalAcceptanceProps) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-left text-sm leading-relaxed transition ${
        checked ? "border-indigo-300 bg-indigo-50/80" : "border-slate-200 bg-white"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className="text-slate-700">
        I have read and agree to the{" "}
        <Link href="/terms" target="_blank" className="font-semibold text-indigo-600 hover:underline">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="font-semibold text-indigo-600 hover:underline">
          Privacy Policy
        </Link>
        , including refund rules: complaints within <strong>12 hours</strong> of payment only,{" "}
        <strong>20% platform fee</strong> deducted on approved refunds, and <strong>no refund after 12 hours</strong>.
      </span>
    </label>
  );
}
