import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { siteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = siteMetadata({
  title: "Placement Jobs",
  description: "Browse placement job openings and apply on TechLaunchpad.",
  openGraph: {
    title: `Placement Jobs | ${brand.name}`,
    description: "Browse placement job openings and apply on TechLaunchpad.",
    url: `${brand.website}/placement`,
    images: [
      {
        url: "/brand/techlaunchpad-logo.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} — Placement`,
      },
    ],
  },
});

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
