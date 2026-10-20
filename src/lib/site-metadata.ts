import type { Metadata } from "next";
import { brand } from "@/config/brand";

const logoPath = "/brand/techlaunchpad-logo.png";

export function siteMetadata(overrides?: Metadata): Metadata {
  return {
    metadataBase: new URL(brand.website),
    title: {
      default: `${brand.name} | Premium Notes Marketplace`,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline,
    icons: {
      icon: [{ url: logoPath, type: "image/png" }],
      shortcut: [logoPath],
      apple: [{ url: logoPath, type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: brand.name,
      title: brand.name,
      description: brand.tagline,
      url: brand.website,
      images: [
        {
          url: logoPath,
          width: 1200,
          height: 630,
          alt: `${brand.name} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brand.name,
      description: brand.tagline,
      images: [logoPath],
    },
    ...overrides,
  };
}
