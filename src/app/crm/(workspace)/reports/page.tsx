export default function CrmReportsPage() {
  return (
    <div className="p-6 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Reports</h1>
      <p className="mt-4 text-sm">
        Metrics are computed from <code className="text-emerald-400">crm_messages</code>, assignments, and usage
        records. Export and chart views can be extended from this data — dashboard counts are live today.
      </p>
    </div>
  );
}
