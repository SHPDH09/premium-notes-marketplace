import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { brandShareImage } from "@/lib/placement/share-metadata";

export function siteMetadata(overrides?: Metadata): Metadata {
  const shareImage = brandShareImage();

  return {
    metadataBase: new URL(brand.website),
    title: {
      default: `${brand.name} | Premium Notes Marketplace`,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline,
    icons: {
      icon: [{ url: "/icon", type: "image/png" }],
      shortcut: [{ url: "/icon", type: "image/png" }],
      apple: [{ url: "/apple-icon", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: brand.name,
      title: brand.name,
      description: brand.tagline,
      url: brand.website,
      images: [
        shareImage,
        {
          url: "/opengraph-image",
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
      images: [shareImage.url],
    },
    ...overrides,
  };
}
