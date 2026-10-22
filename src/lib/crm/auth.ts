import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import type { CrmMemberRole } from "@prisma/client";

export type CrmSessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  memberId?: string;
  memberRole?: CrmMemberRole;
};

export async function getCrmSession(): Promise<CrmSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = session.user.role;
  if (role === "SUPER_ADMIN") {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
    };
  }
  if (role === "COMPANY_ADMIN" || role === "AGENT") {
    const member = await prisma.crmCompanyMember.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { company: true },
    });
    if (!member || member.company.status !== "ACTIVE") return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
      companyId: member.companyId,
      memberId: member.id,
      memberRole: member.memberRole,
    };
  }
  return null;
}

export async function requireSuperAdmin() {
  const user = await getCrmSession();
  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireCompanyMember(opts?: { adminOnly?: boolean }) {
  const user = await getCrmSession();
  if (!user?.companyId || !user.memberId) throw new Error("FORBIDDEN");
  if (opts?.adminOnly && user.memberRole !== "COMPANY_ADMIN" && user.role !== "COMPANY_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user as CrmSessionUser & { companyId: string; memberId: string };
}

export function assertConversationCompany(companyId: string, sessionCompanyId: string) {
  if (companyId !== sessionCompanyId) throw new Error("FORBIDDEN");
}
