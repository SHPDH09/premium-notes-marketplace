import type { Prisma } from "@prisma/client";
import { startOfMonth, subDays } from "date-fns";

export type ContactListFilters = {
  companyId: string;
  q?: string;
  status?: string;
  tagId?: string;
  assignedMemberId?: string;
  source?: string;
  segmentId?: string;
  optedOut?: boolean;
  hasOpenConversation?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  leadStatus?: string;
};

export function buildContactWhere(filters: ContactListFilters): Prisma.CrmContactWhereInput {
  const and: Prisma.CrmContactWhereInput[] = [{ companyId: filters.companyId }];

  if (filters.status) {
    and.push({ status: filters.status as Prisma.EnumCrmContactStatusFilter["equals"] });
  } else {
    and.push({ status: { not: "ARCHIVED" } });
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { phoneNormalized: { contains: normalizeQueryDigits(q) } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { contactTags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  if (filters.tagId) {
    and.push({ contactTags: { some: { tagId: filters.tagId } } });
  }

  if (filters.assignedMemberId === "unassigned") {
    and.push({ assignedMemberId: null });
  } else if (filters.assignedMemberId) {
    and.push({ assignedMemberId: filters.assignedMemberId });
  }

  if (filters.source) {
    and.push({ source: filters.source });
  }

  if (filters.leadStatus) {
    and.push({ leadStatus: filters.leadStatus });
  }

  if (filters.optedOut === true) {
    and.push({ OR: [{ optedOutAt: { not: null } }, { status: "DO_NOT_CONTACT" }] });
  } else if (filters.optedOut === false) {
    and.push({ optedOutAt: null, status: { not: "DO_NOT_CONTACT" } });
  }

  if (filters.hasOpenConversation === true) {
    and.push({ conversations: { some: { status: { in: ["OPEN", "PENDING"] } } } });
  }

  if (filters.createdAfter) {
    and.push({ createdAt: { gte: filters.createdAfter } });
  }
  if (filters.createdBefore) {
    and.push({ createdAt: { lte: filters.createdBefore } });
  }

  return { AND: and };
}

function normalizeQueryDigits(q: string): string {
  return q.replace(/\D/g, "");
}

/** Built-in segment presets (filter_config shape). */
export const BUILTIN_SEGMENTS: Record<
  string,
  Omit<ContactListFilters, "companyId" | "segmentId">
> = {
  new_leads_week: { createdAfter: subDays(new Date(), 7), leadStatus: "new" },
  unassigned: { assignedMemberId: "unassigned" },
  follow_up: { leadStatus: "follow-up" },
  customers: { leadStatus: "customer" },
  opted_out: { optedOut: true },
};

export function segmentFiltersFromConfig(
  config: Record<string, unknown>,
  companyId: string
): ContactListFilters {
  const base: ContactListFilters = { companyId };
  if (typeof config.preset === "string" && BUILTIN_SEGMENTS[config.preset]) {
    return { ...base, ...BUILTIN_SEGMENTS[config.preset] };
  }
  if (config.tagId && typeof config.tagId === "string") base.tagId = config.tagId;
  if (config.assignedMemberId === "unassigned") base.assignedMemberId = "unassigned";
  if (typeof config.assignedMemberId === "string" && config.assignedMemberId !== "unassigned") {
    base.assignedMemberId = config.assignedMemberId;
  }
  if (config.hasOpenConversation === true) base.hasOpenConversation = true;
  if (config.optedOut === true) base.optedOut = true;
  if (config.source && typeof config.source === "string") base.source = config.source;
  if (config.createdAfterDays && typeof config.createdAfterDays === "number") {
    base.createdAfter = subDays(new Date(), config.createdAfterDays);
  }
  return base;
}

export function monthStart(): Date {
  return startOfMonth(new Date());
}
