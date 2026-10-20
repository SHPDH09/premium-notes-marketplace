import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JobShareRedirect } from "@/components/placement/job-share-redirect";
import { brand } from "@/config/brand";
import { getActiveJobPosting } from "@/lib/placement/get-public-job";
import { buildJobShareMetadata, jobShareDescription } from "@/lib/placement/share-metadata";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const meta = await buildJobShareMetadata(params.id);
  return meta ?? { title: "Job not found" };
}

export default async function PlacementJobSharePage({ params }: PageProps) {
  const job = await getActiveJobPosting(params.id);
  if (!job) notFound();

  const description = jobShareDescription(job.title, job.company, job.location);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
      <Image
        src={brand.logoSrc}
        alt={brand.name}
        width={240}
        height={96}
        className="h-auto w-52 object-contain"
        priority
      />
      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-indigo-600">{brand.name} Placement</p>
      <h1 className="mt-2 max-w-xl text-2xl font-bold text-slate-900">{job.title}</h1>
      <p className="mt-2 text-slate-600">
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
      </p>
      <p className="mt-4 max-w-lg text-sm text-slate-500">{description}</p>
      <Button className="mt-8" asChild>
        <Link href={`/placement?job=${encodeURIComponent(job.id)}`}>View job & apply</Link>
      </Button>
      <JobShareRedirect jobId={job.id} />
    </div>
  );
}
