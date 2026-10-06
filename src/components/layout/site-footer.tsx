import Link from "next/link";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href="/privacy" className="font-medium text-slate-600 hover:text-indigo-600">
            Privacy &amp; refunds
          </Link>
          <a href={`mailto:${brand.supportEmail}`} className="text-slate-500 hover:text-indigo-600">
            {brand.supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
