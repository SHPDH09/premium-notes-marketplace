export type AutomationTriggerType =
  | "message.received"
  | "conversation.created"
  | "conversation.assigned"
  | "conversation.status_changed"
  | "session.disconnected"
  | "scheduled.follow_up";

export type ConditionRule = {
  field:
    | "messageText"
    | "conversationStatus"
    | "assignedMemberId"
    | "teamId"
    | "whatsappAccountId"
    | "contactTag"
    | "leadStatus"
    | "businessHours";
  op: "contains" | "equals" | "not_equals" | "exists" | "in";
  value?: string | string[] | boolean;
};

export type ConditionGroup = {
  op: "and" | "or";
  rules: ConditionRule[];
};

export type AutomationAction =
  | { type: "send_reply"; text: string; templateOnly?: boolean }
  | { type: "add_tag"; tagName: string }
  | { type: "remove_tag"; tagName: string }
  | { type: "assign_team"; teamId: string }
  | { type: "assign_member"; memberId: string }
  | { type: "set_priority"; priority: "NORMAL" | "HIGH" | "URGENT" }
  | { type: "set_status"; status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED" }
  | { type: "add_note"; body: string }
  | { type: "notify_member"; memberId: string; title: string; body?: string }
  | { type: "schedule_follow_up"; minutes: number; action: AutomationAction }
  | { type: "wait"; seconds: number };

export type WorkflowConfig = {
  conditions?: ConditionGroup;
  actions: AutomationAction[];
  businessHours?: { timezone: string; start: string; end: string; days: number[] };
  stopOnMatch?: boolean;
};

export type AutomationContext = {
  companyId: string;
  conversationId: string;
  contactId: string;
  whatsappAccountId: string;
  messageText: string;
  triggerType: AutomationTriggerType;
  triggerEventId?: string;
  conversationStatus: string;
  assignedMemberId?: string | null;
  contactTags: string[];
  leadStatus?: string | null;
  testMode?: boolean;
};
