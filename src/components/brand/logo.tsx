import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
        {brand.logoText}
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">{brand.name}</span>
    </Link>
  );
}
