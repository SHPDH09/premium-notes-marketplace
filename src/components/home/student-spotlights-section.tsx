import Image from "next/image";
import { Quote } from "lucide-react";
import { prisma } from "@/lib/db";
import { serializeSpotlight } from "@/lib/collaborators";

async function loadSpotlights() {
  try {
    const items = await prisma.studentSpotlight.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 8,
    });
    return items.map(serializeSpotlight);
  } catch {
    return [];
  }
}

export async function StudentSpotlightsSection() {
  const spotlights = await loadSpotlights();
  if (!spotlights.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Student Spotlight</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Learners Who Trust Us</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {spotlights.map((s) => (
          <article
            key={s.id}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
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
                {s.headline && (
                  <p className="text-xs font-medium text-indigo-600">{s.headline}</p>
                )}
              </div>
            </div>
            {s.quote && <p className="mt-4 text-sm leading-relaxed text-slate-600">&ldquo;{s.quote}&rdquo;</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
