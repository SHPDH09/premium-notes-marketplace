export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "NoteVault Pro",
  tagline: "Premium study notes for ambitious learners",
  logoText: process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? "NV",
  primaryColor: "indigo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@notevault.pro",
} as const;
