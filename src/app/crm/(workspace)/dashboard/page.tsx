import { prisma } from "@/lib/db";
import { getCrmSession } from "@/lib/crm/auth";
import { redirect } from "next/navigation";

export default async function CrmDashboardPage() {
  const session = await getCrmSession();
  if (!session?.companyId) redirect("/crm/login");
  const companyId = session.companyId;
  const [open, unassigned, agents, numbers] = await Promise.all([
    prisma.crmConversation.count({ where: { companyId, status: "OPEN" } }),
    prisma.crmConversation.count({ where: { companyId, assignedMemberId: null } }),
    prisma.crmCompanyMember.count({ where: { companyId, isActive: true } }),
    prisma.crmWhatsAppAccount.count({ where: { companyId, status: "CONNECTED" } }),
  ]);

  const stats = [
    { label: "Open chats", value: open },
    { label: "Unassigned", value: unassigned },
    { label: "Active agents", value: agents },
    { label: "Connected numbers", value: numbers },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Company dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-400">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
