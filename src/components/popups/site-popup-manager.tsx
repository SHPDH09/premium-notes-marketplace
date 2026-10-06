"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PopupSocialLink } from "@/lib/popups";

type PublicPopup = {
  id: string;
  popupType: "TEXT" | "IMAGE";
  title: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  whatsappUrl: string | null;
  socialLinks: PopupSocialLink[];
  repeatMode: "REPEAT" | "ONCE_PER_SESSION" | "ONCE_PER_BROWSER";
};

const STORAGE_PREFIX = "tl-popup-dismissed:";

function isDismissed(popup: PublicPopup): boolean {
  if (popup.repeatMode === "REPEAT") return false;
  if (typeof window === "undefined") return true;
  const key = STORAGE_PREFIX + popup.id;
  if (popup.repeatMode === "ONCE_PER_SESSION") {
    return sessionStorage.getItem(key) === "1";
  }
  return localStorage.getItem(key) === "1";
}

function markDismissed(popup: PublicPopup) {
  const key = STORAGE_PREFIX + popup.id;
  if (popup.repeatMode === "ONCE_PER_SESSION") sessionStorage.setItem(key, "1");
  else if (popup.repeatMode === "ONCE_PER_BROWSER") localStorage.setItem(key, "1");
}

function socialLabel(link: PopupSocialLink): string {
  if (link.label?.trim()) return link.label.trim();
  return link.type.charAt(0).toUpperCase() + link.type.slice(1);
}

export function SitePopupManager() {
  const pathname = usePathname() ?? "/";
  const [queue, setQueue] = useState<PublicPopup[]>([]);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    if (pathname.startsWith("/admin")) {
      setQueue([]);
      return;
    }
    const res = await fetch(`/api/popups?path=${encodeURIComponent(pathname)}`, { cache: "no-store" });
    const data = (await res.json()) as { popups?: PublicPopup[] };
    const eligible = (data.popups ?? []).filter((p) => !isDismissed(p));
    setQueue(eligible);
    setIndex(0);
  }, [pathname]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = queue[index] ?? null;

  const close = useCallback(() => {
    if (!current) return;
    markDismissed(current);
    if (index + 1 < queue.length) setIndex((i) => i + 1);
    else setQueue([]);
  }, [current, index, queue.length]);

  const open = useMemo(() => Boolean(current), [current]);

  if (!open || !current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-label="Close" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white shadow-2xl shadow-indigo-500/20"
      >
        <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:bg-white"
          aria-label="Close popup"
        >
          <X className="h-5 w-5" />
        </button>

        {current.popupType === "IMAGE" && current.imageUrl ? (
          <div className="relative aspect-[16/10] w-full bg-slate-100">
            <Image src={current.imageUrl} alt={current.title ?? "Promotion"} fill className="object-cover" unoptimized />
          </div>
        ) : null}

        <div className="space-y-4 p-6 pt-5">
          {current.title ? <h2 className="pr-8 text-xl font-bold text-slate-900">{current.title}</h2> : null}
          {current.bodyText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{current.bodyText}</p>
          ) : null}

          {current.buttonLabel && current.buttonUrl ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={current.buttonUrl} target={current.buttonUrl.startsWith("http") ? "_blank" : undefined} onClick={close}>
                {current.buttonLabel}
              </Link>
            </Button>
          ) : null}

          {current.whatsappUrl ? (
            <Button variant="outline" asChild className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:w-auto">
              <Link href={current.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={close}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp channel
              </Link>
            </Button>
          ) : null}

          {current.socialLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {current.socialLinks.map((link, i) => (
                <Link
                  key={`${link.url}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  onClick={close}
                >
                  {socialLabel(link)}
                </Link>
              ))}
            </div>
          ) : null}

          {queue.length > 1 ? (
            <p className="text-center text-xs text-slate-400">
              {index + 1} of {queue.length}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
