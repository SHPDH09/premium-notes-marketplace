import Image from "next/image";
import Link from "next/link";
import { Building2, GraduationCap, Landmark } from "lucide-react";
import { prisma } from "@/lib/db";
import { serializeCollaborator } from "@/lib/collaborators";

const typeMeta = {
  COMPANY: { label: "Companies", icon: Building2 },
  COLLEGE: { label: "Colleges", icon: GraduationCap },
  INSTITUTE: { label: "Institutes", icon: Landmark },
} as const;

async function loadCollaborators() {
  try {
    const items = await prisma.collaborator.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map(serializeCollaborator);
  } catch {
    return [];
  }
}

export async function CollaboratorsSection() {
  const collaborators = await loadCollaborators();
  if (!collaborators.length) return null;

  const grouped = {
    COMPANY: collaborators.filter((c) => c.type === "COMPANY"),
    COLLEGE: collaborators.filter((c) => c.type === "COLLEGE"),
    INSTITUTE: collaborators.filter((c) => c.type === "INSTITUTE"),
  };

  return (
    <section className="border-y border-slate-200 bg-gradient-to-b from-white to-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Collaborate</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Trusted Institutes & Companies</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            We partner with leading colleges, institutes, and companies to deliver premium notes to learners everywhere.
          </p>
        </div>

        {(Object.keys(grouped) as (keyof typeof grouped)[]).map((type) => {
          const list = grouped[type];
          if (!list.length) return null;
          const meta = typeMeta[type];
          const Icon = meta.icon;
          return (
            <div key={type} className="mt-12">
              <div className="mb-5 flex items-center gap-2">
                <Icon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">{meta.label}</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((item) => {
                  const inner = (
                    <div className="group flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100">
                      <div className="relative mb-4 flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                        {item.logoImage ? (
                          <Image
                            src={item.logoImage}
                            alt={item.name}
                            width={160}
                            height={80}
                            className="max-h-16 w-auto object-contain"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-indigo-300">{item.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900">{item.name}</h4>
                      {item.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                      )}
                    </div>
                  );
                  return item.website ? (
                    <Link key={item.id} href={item.website} target="_blank" rel="noopener noreferrer">
                      {inner}
                    </Link>
                  ) : (
                    <div key={item.id}>{inner}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
