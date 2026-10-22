import type { CrmCallDirection, CrmCallRecordStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhoneDigits } from "@/lib/crm/phone";

export type CallListParams = {
  companyId: string;
  memberId: string;
  isAdmin: boolean;
  from: Date;
  to: Date;
  q?: string;
  direction?: CrmCallDirection;
  status?: CrmCallRecordStatus;
  contactId?: string;
  agentId?: string;
  sort?: "started_desc" | "started_asc" | "duration_desc";
  page: number;
  pageSize: number;
};

function agentVisibility(memberId: string, isAdmin: boolean): Prisma.CrmCallRecordWhereInput | undefined {
  if (isAdmin) return undefined;
  return {
    OR: [{ assignedMemberId: null }, { assignedMemberId: memberId }],
  };
}

export async function buildCallStats(params: {
  companyId: string;
  memberId: string;
  isAdmin: boolean;
  from: Date;
  to: Date;
}) {
  const base: Prisma.CrmCallRecordWhereInput = {
    companyId: params.companyId,
    startedAt: { gte: params.from, lte: params.to },
    ...agentVisibility(params.memberId, params.isAdmin),
  };

  const [
    total,
    inbound,
    outbound,
    answered,
    missed,
    rejected,
    failed,
    ringing,
    durationAgg,
  ] = await Promise.all([
    prisma.crmCallRecord.count({ where: base }),
    prisma.crmCallRecord.count({ where: { ...base, direction: "INBOUND" } }),
    prisma.crmCallRecord.count({ where: { ...base, direction: "OUTBOUND" } }),
    prisma.crmCallRecord.count({ where: { ...base, status: "ANSWERED" } }),
    prisma.crmCallRecord.count({ where: { ...base, status: "MISSED" } }),
    prisma.crmCallRecord.count({ where: { ...base, status: "REJECTED" } }),
    prisma.crmCallRecord.count({ where: { ...base, status: "FAILED" } }),
    prisma.crmCallRecord.count({ where: { ...base, status: "RINGING" } }),
    prisma.crmCallRecord.aggregate({
      where: { ...base, durationSec: { not: null } },
      _sum: { durationSec: true },
      _avg: { durationSec: true },
      _count: { durationSec: true },
    }),
  ]);

  const totalDurationSec = durationAgg._sum.durationSec ?? 0;
  const avgDurationSec =
    durationAgg._count.durationSec > 0 && durationAgg._avg.durationSec != null
      ? Math.round(durationAgg._avg.durationSec)
      : null;

  return {
    total,
    incoming: inbound,
    outgoing: outbound,
    answered,
    missed,
    rejected,
    failed,
    inProgress: ringing,
    totalDurationSec,
    avgDurationSec,
  };
}

export async function listCallRecords(params: CallListParams) {
  const where: Prisma.CrmCallRecordWhereInput = {
    companyId: params.companyId,
    startedAt: { gte: params.from, lte: params.to },
    ...agentVisibility(params.memberId, params.isAdmin),
  };

  if (params.direction) where.direction = params.direction;
  if (params.status) where.status = params.status;
  if (params.contactId) where.contactId = params.contactId;
  if (params.agentId) where.assignedMemberId = params.agentId;

  if (params.q?.trim()) {
    const q = params.q.trim();
    const digits = normalizePhoneDigits(q);
    where.OR = [
      { contact: { name: { contains: q, mode: "insensitive" } } },
      ...(digits.length >= 4 ? [{ contact: { phoneNormalized: { contains: digits } } }] : []),
      { internalNotes: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.CrmCallRecordOrderByWithRelationInput[] =
    params.sort === "started_asc"
      ? [{ startedAt: "asc" }]
      : params.sort === "duration_desc"
        ? [{ durationSec: "desc" }, { startedAt: "desc" }]
        : [{ startedAt: "desc" }];

  const skip = (params.page - 1) * params.pageSize;

  const [total, rows] = await Promise.all([
    prisma.crmCallRecord.count({ where }),
    prisma.crmCallRecord.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        assignedMember: { include: { user: { select: { name: true } } } },
        conversation: { select: { id: true } },
      },
    }),
  ]);

  return { total, rows };
}

export async function buildAgentCallMetrics(params: {
  companyId: string;
  from: Date;
  to: Date;
  agentId?: string;
}) {
  const where: Prisma.CrmCallRecordWhereInput = {
    companyId: params.companyId,
    startedAt: { gte: params.from, lte: params.to },
    assignedMemberId: params.agentId ? params.agentId : { not: null },
  };

  const members = await prisma.crmCompanyMember.findMany({
    where: {
      companyId: params.companyId,
      isActive: true,
      ...(params.agentId ? { id: params.agentId } : {}),
    },
    include: { user: { select: { name: true } } },
  });

  const results = await Promise.all(
    members.map(async (m) => {
      const w = { ...where, assignedMemberId: m.id };
      const [handled, inbound, outbound, answered, missed, durationAgg, outcomes] = await Promise.all([
        prisma.crmCallRecord.count({ where: w }),
        prisma.crmCallRecord.count({ where: { ...w, direction: "INBOUND" } }),
        prisma.crmCallRecord.count({ where: { ...w, direction: "OUTBOUND" } }),
        prisma.crmCallRecord.count({ where: { ...w, status: "ANSWERED" } }),
        prisma.crmCallRecord.count({ where: { ...w, status: "MISSED" } }),
        prisma.crmCallRecord.aggregate({
          where: { ...w, durationSec: { not: null } },
          _sum: { durationSec: true },
          _avg: { durationSec: true },
        }),
        prisma.crmCallRecord.groupBy({
          by: ["outcome"],
          where: { ...w, outcome: { not: null } },
          _count: { outcome: true },
        }),
      ]);

      return {
        agentId: m.id,
        name: m.user.name,
        handled,
        inbound,
        outbound,
        answered,
        missed,
        totalTalkSec: durationAgg._sum.durationSec ?? 0,
        avgDurationSec:
          durationAgg._avg.durationSec != null ? Math.round(durationAgg._avg.durationSec) : null,
        outcomes: outcomes.map((o) => ({
          outcome: o.outcome,
          count: o._count.outcome,
        })),
      };
    })
  );

  return results.filter((r) => r.handled > 0 || !params.agentId);
}
