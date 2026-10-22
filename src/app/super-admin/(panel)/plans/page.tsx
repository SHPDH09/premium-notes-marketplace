"use client";

import { useEffect, useState } from "react";

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<object[]>([]);
  useEffect(() => {
    void fetch("/api/super-admin/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">Subscription plans</h1>
      <pre className="mt-4 overflow-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
        {JSON.stringify(plans, null, 2)}
      </pre>
    </div>
  );
}
