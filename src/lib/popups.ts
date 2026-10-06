import type { SitePopup } from "@prisma/client";
import { getPublicCoverUrl } from "@/lib/storage";

export const POPUP_PAGE_OPTIONS = [
  { id: "all", label: "All public pages (not admin)" },
  { id: "home", label: "Homepage (/)" },
  { id: "notes", label: "Browse notes (/notes)" },
  { id: "note_detail", label: "Note detail & payment (/notes/...)" },
  { id: "cart", label: "Cart (/cart)" },
  { id: "checkout", label: "Checkout (/checkout/...)" },
  { id: "login", label: "Login (/login)" },
  { id: "register", label: "Register (/register)" },
  { id: "student", label: "Dashboard, purchases, profile" },
  { id: "legal", label: "Privacy & Terms" },
] as const;

export type PopupPageId = (typeof POPUP_PAGE_OPTIONS)[number]["id"];

export type PopupSocialLink = {
  type: "whatsapp" | "instagram" | "facebook" | "youtube" | "telegram" | "twitter" | "linkedin" | "custom";
  label?: string;
  url: string;
};

export function parseSocialLinks(raw: unknown): PopupSocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is PopupSocialLink =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as PopupSocialLink).url === "string" &&
      (x as PopupSocialLink).url.length > 0
  );
}

export function parseTargetPages(raw: unknown): PopupPageId[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(POPUP_PAGE_OPTIONS.map((p) => p.id));
  return raw.filter((x): x is PopupPageId => typeof x === "string" && allowed.has(x as PopupPageId));
}

export function pathnameMatchesPopupTarget(pathname: string, targets: PopupPageId[]): boolean {
  if (!targets.length) return false;
  if (targets.includes("all")) return true;
  const p = pathname.split("?")[0] || "/";
  if (p.startsWith("/admin")) return false;

  for (const t of targets) {
    switch (t) {
      case "home":
        if (p === "/") return true;
        break;
      case "notes":
        if (p === "/notes") return true;
        break;
      case "note_detail":
        if (p.startsWith("/notes/")) return true;
        break;
      case "cart":
        if (p === "/cart") return true;
        break;
      case "checkout":
        if (p.startsWith("/checkout")) return true;
        break;
      case "login":
        if (p === "/login") return true;
        break;
      case "register":
        if (p === "/register") return true;
        break;
      case "student":
        if (["/dashboard", "/purchases", "/transactions", "/profile"].includes(p)) return true;
        break;
      case "legal":
        if (p === "/privacy" || p === "/terms") return true;
        break;
      default:
        break;
    }
  }
  return false;
}

export function isPopupScheduleActive(
  now: Date,
  validFrom: Date | null,
  validUntil: Date | null
): boolean {
  if (validFrom && now < validFrom) return false;
  if (validUntil && now > validUntil) return false;
  return true;
}

export function serializePopupPublic(popup: SitePopup) {
  const socialLinks = parseSocialLinks(popup.socialLinks);
  const targetPages = parseTargetPages(popup.targetPages);
  return {
    id: popup.id,
    popupType: popup.popupType,
    title: popup.title,
    bodyText: popup.bodyText,
    imageUrl: popup.imageStorageKey ? getPublicCoverUrl(popup.imageStorageKey) : null,
    buttonLabel: popup.buttonLabel,
    buttonUrl: popup.buttonUrl,
    whatsappUrl: popup.whatsappUrl,
    socialLinks,
    targetPages,
    validFrom: popup.validFrom?.toISOString() ?? null,
    validUntil: popup.validUntil?.toISOString() ?? null,
    repeatMode: popup.repeatMode,
    sortOrder: popup.sortOrder,
  };
}

export function serializePopupAdmin(popup: SitePopup) {
  return {
    ...serializePopupPublic(popup),
    name: popup.name,
    imageStorageKey: popup.imageStorageKey,
    status: popup.status,
    createdAt: popup.createdAt.toISOString(),
    updatedAt: popup.updatedAt.toISOString(),
  };
}

export const POPUP_REPEAT_LABELS: Record<string, string> = {
  REPEAT: "Show every visit (repeat)",
  ONCE_PER_SESSION: "Once per browser session",
  ONCE_PER_BROWSER: "Once only (do not repeat)",
};
