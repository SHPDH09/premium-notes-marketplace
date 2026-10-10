export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "TechLaunchpad",
  tagline: "Premium study notes for ambitious learners",
  logoSrc: "/brand/techlaunchpad-logo.png",
  logoText: process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? "TL",
  primaryColor: "indigo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "quantronsoft@gmail.com",
} as const;
