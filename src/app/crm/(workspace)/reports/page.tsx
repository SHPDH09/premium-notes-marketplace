import { getCrmSession } from "@/lib/crm/auth";
import { ReportsWorkspace } from "@/components/crm/reports-workspace";

export default async function CrmReportsPage() {
  const session = await getCrmSession();
  const isAdmin = session?.role === "COMPANY_ADMIN" || session?.memberRole === "COMPANY_ADMIN";
  return <ReportsWorkspace isAdmin={!!isAdmin} />;
}
