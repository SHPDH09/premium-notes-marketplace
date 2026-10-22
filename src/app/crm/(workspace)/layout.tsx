import { redirect } from "next/navigation";
import { getCrmSession } from "@/lib/crm/auth";
import { CrmShell } from "@/components/crm/crm-shell";
import { prisma } from "@/lib/db";

export default async function CrmWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getCrmSession();
  if (!session?.companyId) {
    redirect("/crm/login");
  }
  const company = await prisma.crmCompany.findUnique({
    where: { id: session.companyId },
    select: { name: true },
  });
  const isCompanyAdmin = session.role === "COMPANY_ADMIN" || session.memberRole === "COMPANY_ADMIN";

  return (
    <CrmShell isCompanyAdmin={isCompanyAdmin} companyName={company?.name}>
      {children}
    </CrmShell>
  );
}
