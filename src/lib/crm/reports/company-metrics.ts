import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { format, eachDayOfInterval } from "date-fns";

export type CompanyReportFilters = {
  companyId: string;
  from: Date;
  to: Date;
  agentId?: string;
  teamId?: string;
  whatsappAccountId?: string;
};

function convoWhere(f: CompanyReportFilters): Prisma.CrmConversationWhereInput {
  const w: Prisma.CrmConversationWhereInput = {
    companyId: f.companyId,
    createdAt: { gte: f.from, lte: f.to },
  };
  if (f.agentId) w.assignedMemberId = f.agentId;
  if (f.whatsappAccountId) w.whatsappAccountId = f.whatsappAccountId;
  if (f.teamId) w.assignedMember = { teamId: f.teamId };
  return w;
}

function messageWhere(f: CompanyReportFilters): Prisma.CrmMessageWhereInput {
  return {
    sentAt: { gte: f.from, lte: f.to },
    conversation: {
      companyId: f.companyId,
      ...(f.agentId ? { assignedMemberId: f.agentId } : {}),
      ...(f.whatsappAccountId ? { whatsappAccountId: f.whatsappAccountId } : {}),
      ...(f.teamId ? { assignedMember: { teamId: f.teamId } } : {}),
    },
  };
}

export async function buildCompanyReportOverview(f: CompanyReportFilters) {
  const convBase = { companyId: f.companyId };
  const msgWhere = messageWhere(f);

  const [
    totalConversations,
    newConversations,
    openNow,
    pendingNow,
    resolvedInRange,
    closedInRange,
    unassignedNow,
    inbound,
    outbound,
    manualOutbound,
    automationOutbound,
    deliverySent,
    deliveryDelivered,
    deliveryRead,
    deliveryFailed,
    contactsTouched,
  ] = await Promise.all([
    prisma.crmConversation.count({ where: { ...convBase, createdAt: { lte: f.to } } }),
    prisma.crmConversation.count({ where: convoWhere(f) }),
    prisma.crmConversation.count({ where: { ...convBase, status: "OPEN" } }),
    prisma.crmConversation.count({ where: { ...convBase, status: "PENDING" } }),
    prisma.crmConversation.count({
      where: { ...convBase, status: "RESOLVED", updatedAt: { gte: f.from, lte: f.to } },
    }),
    prisma.crmConversation.count({
      where: { ...convBase, status: "CLOSED", updatedAt: { gte: f.from, lte: f.to } },
    }),
    prisma.crmConversation.count({ where: { ...convBase, assignedMemberId: null, status: { in: ["OPEN", "PENDING"] } } }),
    prisma.crmMessage.count({ where: { ...msgWhere, direction: "INBOUND" } }),
    prisma.crmMessage.count({ where: { ...msgWhere, direction: "OUTBOUND" } }),
    prisma.crmMessage.count({
      where: { ...msgWhere, direction: "OUTBOUND", sendMethod: "MANUAL", sentByMemberId: { not: null } },
    }),
    prisma.crmMessage.count({
      where: { ...msgWhere, direction: "OUTBOUND", sendMethod: { in: ["AUTOMATION", "CHATBOT"] } },
    }),
    prisma.crmMessage.count({ where: { ...msgWhere, deliveryStatus: "SENT" } }),
    prisma.crmMessage.count({ where: { ...msgWhere, deliveryStatus: "DELIVERED" } }),
    prisma.crmMessage.count({ where: { ...msgWhere, deliveryStatus: "READ" } }),
    prisma.crmMessage.count({ where: { ...msgWhere, deliveryStatus: "FAILED" } }),
    prisma.crmContact.count({
      where: { companyId: f.companyId, lastActivityAt: { gte: f.from, lte: f.to } },
    }),
  ]);

  return {
    conversations: {
      total: totalConversations,
      newInRange: newConversations,
      open: openNow,
      pending: pendingNow,
      resolvedInRange,
      closedInRange,
      unassigned: unassignedNow,
    },
    messages: {
      inbound,
      outbound,
      manualOutbound,
      automationOutbound,
      delivery: {
        sent: deliverySent,
        delivered: deliveryDelivered,
        read: deliveryRead,
        failed: deliveryFailed,
        note:
          "Delivery/read counts reflect stored message status per message row. WALayer delivery webhooks are not emitted yet — outbound status may stay at SENT after API accept.",
      },
    },
    customers: { contactedInRange: contactsTouched },
  };
}

export async function buildConversationTrend(f: CompanyReportFilters) {
  const rows = await prisma.$queryRaw<{ day: Date; c: bigint }[]>`
    SELECT date_trunc('day', created_at) as day, count(*)::bigint as c
    FROM crm_conversations
    WHERE company_id = ${f.companyId}
      AND created_at >= ${f.from} AND created_at <= ${f.to}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [format(r.day, "yyyy-MM-dd"), Number(r.c)]));
  const days = eachDayOfInterval({ start: f.from, end: f.to });
  return days.map((d) => ({
    date: format(d, "yyyy-MM-dd"),
    conversations: map.get(format(d, "yyyy-MM-dd")) ?? 0,
  }));
}

export async function buildMessageTrend(f: CompanyReportFilters) {
  const inbound = await prisma.$queryRaw<{ day: Date; c: bigint }[]>`
    SELECT date_trunc('day', m.sent_at) as day, count(*)::bigint as c
    FROM crm_messages m
    JOIN crm_conversations c ON c.id = m.conversation_id
    WHERE c.company_id = ${f.companyId}
      AND m.sent_at >= ${f.from} AND m.sent_at <= ${f.to}
      AND m.direction = 'INBOUND'
    GROUP BY 1 ORDER BY 1`;

  const outbound = await prisma.$queryRaw<{ day: Date; c: bigint }[]>`
    SELECT date_trunc('day', m.sent_at) as day, count(*)::bigint as c
    FROM crm_messages m
    JOIN crm_conversations c ON c.id = m.conversation_id
    WHERE c.company_id = ${f.companyId}
      AND m.sent_at >= ${f.from} AND m.sent_at <= ${f.to}
      AND m.direction = 'OUTBOUND'
    GROUP BY 1 ORDER BY 1`;

  const mapIn = new Map(inbound.map((r) => [format(r.day, "yyyy-MM-dd"), Number(r.c)]));
  const mapOut = new Map(outbound.map((r) => [format(r.day, "yyyy-MM-dd"), Number(r.c)]));
  const days = eachDayOfInterval({ start: f.from, end: f.to });

  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, inbound: mapIn.get(key) ?? 0, outbound: mapOut.get(key) ?? 0 };
  });
}

export async function buildAgentPerformance(f: CompanyReportFilters) {
  const members = await prisma.crmCompanyMember.findMany({
    where: {
      companyId: f.companyId,
      isActive: true,
      ...(f.teamId ? { teamId: f.teamId } : {}),
      ...(f.agentId ? { id: f.agentId } : {}),
    },
    include: { user: true, team: true },
  });

  const results = [];
  for (const m of members) {
    const assigned = await prisma.crmConversation.count({
      where: {
        companyId: f.companyId,
        assignedMemberId: m.id,
        createdAt: { gte: f.from, lte: f.to },
      },
    });
    const resolved = await prisma.crmConversation.count({
      where: {
        companyId: f.companyId,
        assignedMemberId: m.id,
        status: "RESOLVED",
        updatedAt: { gte: f.from, lte: f.to },
      },
    });
    const pending = await prisma.crmConversation.count({
      where: { companyId: f.companyId, assignedMemberId: m.id, status: { in: ["OPEN", "PENDING"] } },
    });
    const replies = await prisma.crmMessage.count({
      where: {
        sentAt: { gte: f.from, lte: f.to },
        direction: "OUTBOUND",
        sendMethod: "MANUAL",
        sentByMemberId: m.id,
        conversation: { companyId: f.companyId },
      },
    });
    const inboundHandled = await prisma.crmMessage.count({
      where: {
        sentAt: { gte: f.from, lte: f.to },
        direction: "INBOUND",
        conversation: { companyId: f.companyId, assignedMemberId: m.id },
      },
    });

    results.push({
      agentId: m.id,
      name: m.user.name,
      team: m.team?.name ?? null,
      assignedConversations: assigned,
      resolvedConversations: resolved,
      pendingConversations: pending,
      manualReplies: replies,
      inboundOnAssignedChats: inboundHandled,
      avgFirstResponseMinutes: null as number | null,
      note: "First-response SLA requires per-thread timestamps; aggregate SLA will be added when assignment events are fully logged.",
    });
  }

  return results;
}

export async function buildTeamPerformance(f: CompanyReportFilters) {
  const teams = await prisma.crmTeam.findMany({ where: { companyId: f.companyId } });
  const out = [];
  for (const team of teams) {
    const agentIds = (
      await prisma.crmCompanyMember.findMany({
        where: { companyId: f.companyId, teamId: team.id, isActive: true },
        select: { id: true },
      })
    ).map((a) => a.id);

    if (!agentIds.length) {
      out.push({
        teamId: team.id,
        teamName: team.name,
        agents: 0,
        conversations: 0,
        resolved: 0,
        pending: 0,
      });
      continue;
    }

    const conversations = await prisma.crmConversation.count({
      where: {
        companyId: f.companyId,
        assignedMemberId: { in: agentIds },
        createdAt: { gte: f.from, lte: f.to },
      },
    });
    const resolved = await prisma.crmConversation.count({
      where: {
        companyId: f.companyId,
        assignedMemberId: { in: agentIds },
        status: "RESOLVED",
        updatedAt: { gte: f.from, lte: f.to },
      },
    });
    const pending = await prisma.crmConversation.count({
      where: {
        companyId: f.companyId,
        assignedMemberId: { in: agentIds },
        status: { in: ["OPEN", "PENDING"] },
      },
    });

    out.push({
      teamId: team.id,
      teamName: team.name,
      agents: agentIds.length,
      conversations,
      resolved,
      pending,
    });
  }
  return out;
}

export async function buildWhatsAppNumberReports(f: CompanyReportFilters) {
  const accounts = await prisma.crmWhatsAppAccount.findMany({
    where: { companyId: f.companyId, ...(f.whatsappAccountId ? { id: f.whatsappAccountId } : {}) },
  });

  return Promise.all(
    accounts.map(async (acc) => {
      const msgFilter = {
        sentAt: { gte: f.from, lte: f.to },
        conversation: { companyId: f.companyId, whatsappAccountId: acc.id },
      };
      const [inbound, outbound, activeConversations, failed] = await Promise.all([
        prisma.crmMessage.count({ where: { ...msgFilter, direction: "INBOUND" } }),
        prisma.crmMessage.count({ where: { ...msgFilter, direction: "OUTBOUND" } }),
        prisma.crmConversation.count({
          where: { companyId: f.companyId, whatsappAccountId: acc.id, status: { in: ["OPEN", "PENDING"] } },
        }),
        prisma.crmMessage.count({
          where: { ...msgFilter, direction: "OUTBOUND", deliveryStatus: "FAILED" },
        }),
      ]);
      return {
        id: acc.id,
        label: acc.label,
        phoneE164: acc.phoneE164,
        status: acc.status,
        statusMessage: acc.statusMessage,
        lastConnectedAt: acc.lastConnectedAt?.toISOString() ?? null,
        inbound,
        outbound,
        activeConversations,
        failedOutbound: failed,
      };
    })
  );
}

export async function buildCampaignReports(f: CompanyReportFilters) {
  const campaigns = await prisma.crmCampaign.findMany({
    where: { companyId: f.companyId, createdAt: { gte: f.from, lte: f.to } },
    include: { _count: { select: { recipients: true } } },
  });

  return campaigns.map((c) => {
    const stats = (c.stats as Record<string, number> | null) ?? {};
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      scheduledAt: c.scheduledAt?.toISOString() ?? null,
      recipientCount: c._count.recipients,
      sent: stats.sent ?? null,
      delivered: stats.delivered ?? null,
      read: stats.read ?? null,
      failed: stats.failed ?? null,
      note:
        c._count.recipients > 0 && !stats.sent
          ? "Campaign runner not fully deployed — recipient rows exist but send stats may be empty."
          : null,
    };
  });
}

export async function buildCallReports(f: CompanyReportFilters) {
  const where = { companyId: f.companyId, startedAt: { gte: f.from, lte: f.to } };
  const [total, missed, rejected, ringing, answered, inbound, outbound, durationAgg] =
    await Promise.all([
      prisma.crmCallRecord.count({ where }),
      prisma.crmCallRecord.count({ where: { ...where, status: "MISSED" } }),
      prisma.crmCallRecord.count({ where: { ...where, status: "REJECTED" } }),
      prisma.crmCallRecord.count({ where: { ...where, status: "RINGING" } }),
      prisma.crmCallRecord.count({ where: { ...where, status: "ANSWERED" } }),
      prisma.crmCallRecord.count({ where: { ...where, direction: "INBOUND" } }),
      prisma.crmCallRecord.count({ where: { ...where, direction: "OUTBOUND" } }),
      prisma.crmCallRecord.aggregate({
        where: { ...where, durationSec: { not: null } },
        _avg: { durationSec: true },
        _sum: { durationSec: true },
      }),
    ]);

  return {
    available: true,
    note: "WALayer supports incoming call events and reject only — no outgoing WhatsApp call API.",
    total,
    inbound,
    outbound,
    missed,
    rejected,
    ringing,
    answered,
    failed: await prisma.crmCallRecord.count({ where: { ...where, status: "FAILED" } }),
    totalDurationSec: durationAgg._sum.durationSec ?? 0,
    avgDurationSec:
      durationAgg._avg.durationSec != null ? Math.round(durationAgg._avg.durationSec) : null,
  };
}
