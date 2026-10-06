import Image from "next/image";
import { Quote } from "lucide-react";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";
import { HorizontalMarquee } from "@/components/ui/horizontal-marquee";

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
    <article className="relative w-[min(100vw-2rem,340px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Quote className="absolute right-4 top-4 h-8 w-8 text-indigo-100" />
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-indigo-100">
          {s.photo ? (
            <Image src={s.photo} alt={s.displayName} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-indigo-600">
              {s.displayName.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{s.displayName}</h3>
          {s.institute && <p className="text-sm text-slate-500">{s.institute}</p>}
          {s.headline && <p className="text-xs font-medium text-indigo-600">{s.headline}</p>}
        </div>
      </div>
      {s.quote && (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">&ldquo;{s.quote}&rdquo;</p>
      )}
    </article>
  );
}

export async function StudentSpotlightsSection() {
  const spotlights = await loadSpotlights();
  if (!spotlights.length) return null;

  const cards = spotlights.map((s) => <SpotlightCard key={s.id} s={s} />);

  return (
    <section className="overflow-hidden py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Student Spotlight</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Learners Who Trust Us</h2>
        </div>
      </div>
      <HorizontalMarquee durationSec={spotlights.length > 4 ? 50 : 70} className="px-4">
        {cards}
      </HorizontalMarquee>
    </section>
  );
}
