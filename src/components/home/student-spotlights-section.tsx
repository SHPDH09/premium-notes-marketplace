import Image from "next/image";
import { Quote, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";
import { HorizontalMarquee } from "@/components/ui/horizontal-marquee";
import { brand } from "@/config/brand";

async function loadSpotlights() {
  try {
    const items = await prisma.studentSpotlight.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    });
    return items.map(serializeSpotlight);
  } catch {
    return [];
  }
}

function SpotlightCard({ s }: { s: ReturnType<typeof serializeSpotlight> }) {
  return (
    <article className="relative w-[min(100vw-2rem,360px)] shrink-0 snap-start">
      <div className="rounded-[1.35rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 p-[2px] shadow-xl shadow-indigo-500/25">
        <div className="relative overflow-hidden rounded-[1.25rem] bg-white p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 text-7xl font-black text-indigo-50">
            {brand.logoText}
          </div>
          <Quote className="absolute right-5 top-5 h-9 w-9 text-indigo-100" />
          <div className="relative flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-inner">
              {s.photo ? (
                <Image src={s.photo} alt={s.displayName} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-indigo-600">
                  {s.displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold text-slate-900">{s.displayName}</h3>
              {s.institute && <p className="truncate text-sm text-slate-500">{s.institute}</p>}
              {s.headline && (
                <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {s.headline}
                </p>
              )}
            </div>
          </div>
          {s.quote && (
            <p className="relative mt-5 text-sm leading-relaxed text-slate-600">
              &ldquo;{s.quote}&rdquo;
            </p>
          )}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold text-indigo-600">{brand.name}</span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Verified learner
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export async function StudentSpotlightsSection() {
  const spotlights = await loadSpotlights();
  if (!spotlights.length) return null;

  const cards = spotlights.map((s) => <SpotlightCard key={s.id} s={s} />);

  return (
    <section className="relative overflow-hidden border-y border-indigo-100 bg-gradient-to-b from-white via-indigo-50/30 to-white py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Student Spotlight
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Learners Who Trust Us
          </h2>
          <p className="mt-3 text-slate-600">
            Real stories from students using {brand.name} notes to prepare faster and score better.
          </p>
        </div>
      </div>
      <HorizontalMarquee durationSec={spotlights.length > 4 ? 50 : 70} className="relative px-4">
        {cards}
      </HorizontalMarquee>
    </section>
  );
}
