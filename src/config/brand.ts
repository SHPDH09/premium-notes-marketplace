export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "TechLaunchpad",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "TechLaunchpad",
  tagline: "Premium study notes for ambitious learners",
  logoSrc: "/brand/techlaunchpad-logo.png",
  logoText: process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? "TL",
  primaryColor: "indigo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "quantronsoft@gmail.com",
  website:
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.techlaunchpad.in",
  placeOfSupply: process.env.NEXT_PUBLIC_PLACE_OF_SUPPLY ?? "India",
} as const;
