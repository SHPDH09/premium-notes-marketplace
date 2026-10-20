import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <span className="relative block overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-md shadow-slate-200/80">
        <Image
          src={brand.logoSrc}
          alt={brand.name}
          width={160}
          height={44}
          className="h-9 w-auto max-w-[min(160px,42vw)] object-contain"
          priority
        />
      </span>
    </Link>
  );
}
