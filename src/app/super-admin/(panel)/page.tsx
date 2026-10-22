"use client";

import { useEffect, useState } from "react";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    void fetch("/api/super-admin/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d.stats ?? null));
  }, []);

  if (!stats) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase text-slate-500">{k.replace(/([A-Z])/g, " $1")}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
