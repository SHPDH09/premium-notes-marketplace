import type { AutomationContext, ConditionGroup, ConditionRule } from "@/lib/crm/automation/types";

function evalRule(rule: ConditionRule, ctx: AutomationContext): boolean {
  switch (rule.field) {
    case "messageText": {
      const text = ctx.messageText.toLowerCase();
      const val = String(rule.value ?? "").toLowerCase();
      if (rule.op === "contains") return val.length > 0 && text.includes(val);
      if (rule.op === "equals") return text === val;
      return false;
    }
    case "conversationStatus":
      if (rule.op === "equals") return ctx.conversationStatus === rule.value;
      if (rule.op === "not_equals") return ctx.conversationStatus !== rule.value;
      return false;
    case "assignedMemberId":
      if (rule.op === "exists") return !!ctx.assignedMemberId;
      if (rule.op === "equals") return ctx.assignedMemberId === rule.value;
      return false;
    case "whatsappAccountId":
      return rule.op === "equals" && ctx.whatsappAccountId === rule.value;
    case "contactTag": {
      const tag = String(rule.value ?? "");
      if (rule.op === "contains" || rule.op === "equals") return ctx.contactTags.includes(tag);
      return false;
    }
    case "leadStatus":
      if (rule.op === "equals") return ctx.leadStatus === rule.value;
      return false;
    case "businessHours":
      return rule.op === "equals" && rule.value === true;
    default:
      return false;
  }
}

export function evaluateConditions(group: ConditionGroup | undefined, ctx: AutomationContext): boolean {
  if (!group?.rules?.length) return true;
  if (group.op === "or") {
    return group.rules.some((r) => evalRule(r, ctx));
  }
  return group.rules.every((r) => evalRule(r, ctx));
}
