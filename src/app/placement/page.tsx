import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLoading } from "@/components/brand/brand-loading";
import { buildPlacementPageMetadata } from "@/lib/placement/share-metadata";
import { PlacementPageClient } from "@/app/placement/placement-page-client";

type PageProps = {
  searchParams?: { job?: string };
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return buildPlacementPageMetadata(searchParams?.job);
}

export default function PlacementPage() {
  return (
    <Suspense fallback={<BrandLoading fullPage message="Loading placement…" />}>
      <PlacementPageClient />
    </Suspense>
  );
}
