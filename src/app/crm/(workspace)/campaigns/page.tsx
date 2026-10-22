export default function CrmCampaignsPage() {
  return (
    <div className="p-6 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Campaigns</h1>
      <p className="mt-4 max-w-xl text-sm">
        Campaign schema and UI shell are in place. Sending uses WALayer bulk/campaign endpoints with plan limits and
        opt-out lists — configure recipients and templates in a follow-up once your WALayer workspace is verified for
        outbound volume.
      </p>
    </div>
  );
}
