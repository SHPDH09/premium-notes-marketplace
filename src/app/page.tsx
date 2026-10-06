import Link from "next/link";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/note-card";
import { brand } from "@/config/brand";
import { prisma } from "@/lib/db";
import { serializeNotePublic } from "@/lib/serializers";
import { BookOpen, ShieldCheck, Sparkles, GraduationCap } from "lucide-react";
import { CollaboratorsSection } from "@/components/home/collaborators-section";
import { StudentSpotlightsSection } from "@/components/home/student-spotlights-section";

export const dynamic = "force-dynamic";

async function getNotes() {
  try {
    const notes = await prisma.note.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    return notes.map((n) => serializeNotePublic(n));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const notes = await getNotes();
  const featured = notes.slice(0, 4);
  const popular = [...notes].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, 4);

  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.12),transparent_45%)]" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" /> Premium EdTech Marketplace
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Study smarter with curated premium notes
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">{brand.tagline}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/notes">Browse Notes</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/register">Create Student Account</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-xl shadow-indigo-100/50">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: BookOpen, title: "Expert Notes", text: "High-quality PDFs and resources" },
                  { icon: ShieldCheck, title: "Secure Access", text: "Purchase-gated downloads" },
                  { icon: GraduationCap, title: "Student Dashboard", text: "Track purchases & receipts" },
                  { icon: Sparkles, title: "Smart Coupons", text: "Save more on bundles" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/80 p-4 shadow-sm">
                    <item.icon className="h-5 w-5 text-indigo-600" />
                    <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Notes</h2>
              <p className="text-slate-500">Handpicked resources from our admin catalog</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/notes">View all</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.length ? (
              featured.map((note) => <NoteCard key={note.id} note={note} showPdfPreview />)
            ) : (
              <p className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                Notes will appear here once the admin publishes them.
              </p>
            )}
          </div>
        </section>

        <CollaboratorsSection />
        <StudentSpotlightsSection />

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">Popular Notes</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((note) => (
                <NoteCard key={`pop-${note.id}`} note={note} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Why Choose {brand.name}?</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              "Premium UI and seamless mobile experience",
              "Verified checkout with server-side pricing",
              "Secure PDF access only after purchase",
            ].map((text) => (
              <div key={text} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-medium text-slate-700">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-indigo-600 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold">Purchase in 3 simple steps</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {["Browse notes", "Apply coupon in cart", "Checkout securely"].map((step, i) => (
                <div key={step} className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                  <div className="text-3xl font-bold text-indigo-200">0{i + 1}</div>
                  <p className="mt-2 text-lg font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p className="text-sm text-slate-500">{brand.supportEmail}</p>
        </div>
      </footer>
    </div>
  );
}
