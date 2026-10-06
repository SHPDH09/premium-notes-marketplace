"use client";

import { cn } from "@/lib/utils";

type HorizontalMarqueeProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds for one full loop */
  durationSec?: number;
};

export function HorizontalMarquee({
  children,
  className,
  durationSec = 45,
}: HorizontalMarqueeProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="flex w-max gap-6 motion-reduce:animate-none animate-marquee hover:[animation-play-state:paused]"
        style={{ animationDuration: `${durationSec}s` }}
      >
        <div className="flex shrink-0 gap-6">{children}</div>
        <div className="flex shrink-0 gap-6" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Manual left–right scroll (touch / trackpad / scrollbar) */
export function HorizontalScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory",
        "[scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300",
        className
      )}
    >
      {children}
    </div>
  );
}
