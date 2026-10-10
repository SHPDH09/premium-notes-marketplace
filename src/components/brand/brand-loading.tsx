"use client";

import Image from "next/image";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { box: "h-14 w-36", img: { width: 140, height: 48 } },
  md: { box: "h-20 w-52", img: { width: 200, height: 68 } },
  lg: { box: "h-28 w-72", img: { width: 280, height: 96 } },
} as const;

export function BrandLoading(props: {
  message?: string;
  size?: keyof typeof sizeMap;
  fullPage?: boolean;
  className?: string;
}) {
  const size = props.size ?? "md";
  const dims = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        props.fullPage && "min-h-[min(50vh,420px)] w-full py-12",
        props.className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loading-scene" style={{ perspective: "900px" }}>
        <div
          className={cn(
            "brand-loading-card relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)]",
            dims.box
          )}
        >
          <div className="brand-loading-shine pointer-events-none absolute inset-0 z-10" aria-hidden />
          <Image
            src={brand.logoSrc}
            alt={brand.name}
            width={dims.img.width}
            height={dims.img.height}
            className="relative z-[1] h-full w-full object-contain object-center"
            priority
          />
        </div>
      </div>
      {props.message ? (
        <p className="max-w-xs text-sm font-medium text-slate-500">{props.message}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
