import { getCrmSession } from "@/lib/crm/auth";
import { CallsWorkspace } from "@/components/crm/calls-workspace";

export default async function CrmCallsPage() {
  const session = await getCrmSession();
  const isAdmin =
    session?.role === "COMPANY_ADMIN" || session?.memberRole === "COMPANY_ADMIN";

  return <CallsWorkspace isAdmin={!!isAdmin} />;
}
