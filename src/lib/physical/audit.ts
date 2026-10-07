import { prisma } from "@/lib/db";

export async function logAdminAudit(params: {
  adminId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    },
  });
}
