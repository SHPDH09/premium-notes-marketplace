export default function CrmSettingsPage() {
  return (
    <div className="p-6 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Automation & branding</h1>
      <p className="mt-4 text-sm">
        Store rules in <code className="text-emerald-400">crm_automation_rules</code>. Welcome/away messages and
        round-robin assignment hooks run from the webhook processor — add rules via API or upcoming UI forms.
      </p>
    </div>
  );
}
