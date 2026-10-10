export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "TechLaunchpad",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "TechLaunchpad",
  tagline: "Premium study notes for ambitious learners",
  logoSrc: "/brand/techlaunchpad-logo.png",
  logoText: process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? "TL",
  primaryColor: "indigo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "quantronsoft@gmail.com",
  /** Public site on bills, footers — not NEXT_PUBLIC_APP_URL (often a Vercel preview URL). */
  website: (
    process.env.NEXT_PUBLIC_BRAND_WEBSITE ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.techlaunchpad.in"
  ).replace(/\/$/, ""),
  placeOfSupply: process.env.NEXT_PUBLIC_PLACE_OF_SUPPLY ?? "India",
} as const;
