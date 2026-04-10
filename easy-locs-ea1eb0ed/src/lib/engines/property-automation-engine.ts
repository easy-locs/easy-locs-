import { platformBus } from "@/lib/shared/platform-bus";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  cooldownMs?: number;
  lastFiredAt?: number;
}

export type AutomationTrigger =
  | { type: "schedule"; cronLike: string }
  | { type: "event"; eventName: string }
  | { type: "threshold"; metric: string; operator: "gt" | "lt" | "eq"; value: number };

export interface AutomationCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: unknown;
}

export interface AutomationAction {
  type: "notify" | "email" | "update_status" | "create_task" | "emit_event" | "score_lead"
    | "generate_receipt" | "trigger_rent_call" | "compliance_check" | "signature_reminder";
  params: Record<string, unknown>;
}

const BUILT_IN_RULES: AutomationRule[] = [
  {
    id: "rent_reminder_7d",
    name: "Rent due reminder (7 days before)",
    trigger: { type: "schedule", cronLike: "daily_9am" },
    conditions: [
      { field: "daysUntilDue", operator: "lte", value: 7 },
      { field: "paymentStatus", operator: "neq", value: "paid" },
    ],
    actions: [
      { type: "notify", params: { template: "rent_reminder", channel: "push" } },
      { type: "emit_event", params: { event: "automation.rent_reminder" } },
    ],
    enabled: true,
    cooldownMs: 86400000,
  },
  {
    id: "document_expiry_30d",
    name: "Document expiry alert (30 days)",
    trigger: { type: "schedule", cronLike: "daily_10am" },
    conditions: [
      { field: "daysUntilExpiry", operator: "lte", value: 30 },
      { field: "documentStatus", operator: "neq", value: "renewed" },
    ],
    actions: [
      { type: "notify", params: { template: "document_expiry", channel: "push" } },
      { type: "emit_event", params: { event: "automation.document_expiry" } },
    ],
    enabled: true,
    cooldownMs: 604800000,
  },
  {
    id: "lease_renewal_60d",
    name: "Lease renewal reminder (60 days before end)",
    trigger: { type: "schedule", cronLike: "weekly_monday" },
    conditions: [
      { field: "daysUntilLeaseEnd", operator: "lte", value: 60 },
      { field: "leaseStatus", operator: "eq", value: "active" },
    ],
    actions: [
      { type: "notify", params: { template: "lease_renewal", channel: "push" } },
      { type: "create_task", params: { type: "renewal_check", priority: "high" } },
    ],
    enabled: true,
    cooldownMs: 604800000,
  },
  {
    id: "vacancy_alert_30d",
    name: "Extended vacancy alert (30+ days vacant)",
    trigger: { type: "schedule", cronLike: "weekly_monday" },
    conditions: [
      { field: "daysVacant", operator: "gte", value: 30 },
      { field: "propertyStatus", operator: "in", value: ["published", "draft"] },
    ],
    actions: [
      { type: "notify", params: { template: "vacancy_alert", channel: "push" } },
      { type: "emit_event", params: { event: "automation.vacancy_alert" } },
    ],
    enabled: true,
    cooldownMs: 604800000,
  },
  {
    id: "lead_score_auto",
    name: "Auto-score leads on activity",
    trigger: { type: "event", eventName: "lead.activity" },
    conditions: [],
    actions: [
      { type: "score_lead", params: {} },
    ],
    enabled: true,
  },
  {
    id: "viewing_reminder_1d",
    name: "Viewing reminder (1 day before)",
    trigger: { type: "schedule", cronLike: "daily_8am" },
    conditions: [
      { field: "hoursUntilViewing", operator: "lte", value: 24 },
      { field: "viewingStatus", operator: "in", value: ["confirmed", "requested"] },
    ],
    actions: [
      { type: "notify", params: { template: "viewing_reminder", channel: "push" } },
    ],
    enabled: true,
    cooldownMs: 43200000,
  },
  {
    id: "incomplete_listing",
    name: "Incomplete listing detection",
    trigger: { type: "schedule", cronLike: "daily_11am" },
    conditions: [
      { field: "qualityScore", operator: "lt", value: 60 },
      { field: "propertyStatus", operator: "eq", value: "draft" },
      { field: "daysAsDraft", operator: "gte", value: 3 },
    ],
    actions: [
      { type: "notify", params: { template: "incomplete_listing", channel: "push" } },
      { type: "emit_event", params: { event: "automation.incomplete_listing" } },
    ],
    enabled: true,
    cooldownMs: 259200000,
  },
  {
    id: "maintenance_sla_breach",
    name: "Maintenance SLA breach alert",
    trigger: { type: "threshold", metric: "ticketAge", operator: "gt", value: 48 },
    conditions: [
      { field: "ticketStatus", operator: "in", value: ["open", "assigned"] },
      { field: "ticketPriority", operator: "in", value: ["high", "urgent"] },
    ],
    actions: [
      { type: "notify", params: { template: "sla_breach", channel: "push", escalate: true } },
      { type: "emit_event", params: { event: "automation.sla_breach" } },
    ],
    enabled: true,
    cooldownMs: 14400000,
  },
  {
    id: "overdue_payment",
    name: "Overdue payment escalation",
    trigger: { type: "schedule", cronLike: "daily_9am" },
    conditions: [
      { field: "paymentStatus", operator: "eq", value: "overdue" },
      { field: "daysOverdue", operator: "gte", value: 5 },
    ],
    actions: [
      { type: "notify", params: { template: "overdue_payment", channel: "push" } },
      { type: "create_task", params: { type: "follow_up", priority: "urgent" } },
    ],
    enabled: true,
    cooldownMs: 172800000,
  },
  {
    id: "auto_receipt_on_payment",
    name: "Auto-generate rent receipt on payment",
    trigger: { type: "event", eventName: "rent.paid" },
    conditions: [],
    actions: [
      { type: "generate_receipt", params: {} },
      { type: "notify", params: { template: "receipt_generated", channel: "push" } },
      { type: "emit_event", params: { event: "automation.receipt_generated" } },
    ],
    enabled: true,
  },
  {
    id: "monthly_rent_call_generation",
    name: "Generate monthly rent calls on 1st",
    trigger: { type: "schedule", cronLike: "monthly_1st_8am" },
    conditions: [
      { field: "leaseStatus", operator: "eq", value: "active" },
    ],
    actions: [
      { type: "trigger_rent_call", params: {} },
      { type: "emit_event", params: { event: "automation.rent_calls_generated" } },
    ],
    enabled: true,
    cooldownMs: 2592000000,
  },
  {
    id: "lease_renewal_compliance_check",
    name: "Compliance check before lease renewal",
    trigger: { type: "event", eventName: "lease.renewal_initiated" },
    conditions: [],
    actions: [
      { type: "compliance_check", params: { scope: "full" } },
      { type: "emit_event", params: { event: "automation.compliance_checked" } },
    ],
    enabled: true,
  },
  {
    id: "overdue_payment_orbit_relance",
    name: "Send Orbit message for overdue rent (10+ days)",
    trigger: { type: "schedule", cronLike: "daily_10am" },
    conditions: [
      { field: "paymentStatus", operator: "eq", value: "overdue" },
      { field: "daysOverdue", operator: "gte", value: 10 },
      { field: "reminderCount", operator: "lt", value: 3 },
    ],
    actions: [
      { type: "notify", params: { template: "overdue_relance", channel: "orbit" } },
      { type: "emit_event", params: { event: "automation.overdue_relance" } },
    ],
    enabled: true,
    cooldownMs: 259200000,
  },
  {
    id: "signature_expiry_reminder",
    name: "Signature request expiring soon (2 days)",
    trigger: { type: "schedule", cronLike: "daily_9am" },
    conditions: [
      { field: "daysUntilSignatureExpiry", operator: "lte", value: 2 },
      { field: "signatureStatus", operator: "eq", value: "pending" },
    ],
    actions: [
      { type: "signature_reminder", params: {} },
      { type: "notify", params: { template: "signature_expiring", channel: "push" } },
    ],
    enabled: true,
    cooldownMs: 86400000,
  },
  {
    id: "partial_payment_followup",
    name: "Follow up on partial payments (3 days)",
    trigger: { type: "schedule", cronLike: "daily_10am" },
    conditions: [
      { field: "paymentStatus", operator: "eq", value: "partial" },
      { field: "daysSincePartialPayment", operator: "gte", value: 3 },
    ],
    actions: [
      { type: "notify", params: { template: "partial_payment_followup", channel: "push" } },
      { type: "emit_event", params: { event: "automation.partial_payment_followup" } },
    ],
    enabled: true,
    cooldownMs: 259200000,
  },
  {
    id: "insurance_expiry_alert",
    name: "Insurance expiry alert (30 days before)",
    trigger: { type: "schedule", cronLike: "weekly_monday" },
    conditions: [
      { field: "daysUntilInsuranceExpiry", operator: "lte", value: 30 },
      { field: "insuranceMandatory", operator: "eq", value: true },
    ],
    actions: [
      { type: "notify", params: { template: "insurance_expiry", channel: "push" } },
      { type: "emit_event", params: { event: "automation.insurance_expiry" } },
    ],
    enabled: true,
    cooldownMs: 604800000,
  },
];

let initialized = false;

export function getPropertyAutomationRules(): AutomationRule[] {
  return [...BUILT_IN_RULES];
}

export function evaluateConditions(
  conditions: AutomationCondition[],
  context: Record<string, unknown>,
): boolean {
  return conditions.every(cond => {
    const val = context[cond.field];
    switch (cond.operator) {
      case "eq": return val === cond.value;
      case "neq": return val !== cond.value;
      case "gt": return typeof val === "number" && val > (cond.value as number);
      case "lt": return typeof val === "number" && val < (cond.value as number);
      case "gte": return typeof val === "number" && val >= (cond.value as number);
      case "lte": return typeof val === "number" && val <= (cond.value as number);
      case "in": return Array.isArray(cond.value) && cond.value.includes(val);
      case "contains": return typeof val === "string" && typeof cond.value === "string" && val.includes(cond.value);
      default: return true;
    }
  });
}

export function executeActions(
  actions: AutomationAction[],
  context: Record<string, unknown>,
): void {
  for (const action of actions) {
    switch (action.type) {
      case "emit_event":
        platformBus.emit(action.params.event as string, context);
        break;
      case "notify":
        platformBus.emit("automation.notification", {
          template: action.params.template,
          channel: action.params.channel,
          context,
        });
        break;
      default:
        platformBus.emit(`automation.action.${action.type}`, { ...action.params, context });
    }
  }
}

export function fireRule(rule: AutomationRule, context: Record<string, unknown>): boolean {
  if (!rule.enabled) return false;

  if (rule.cooldownMs && rule.lastFiredAt) {
    if (Date.now() - rule.lastFiredAt < rule.cooldownMs) return false;
  }

  if (!evaluateConditions(rule.conditions, context)) return false;

  executeActions(rule.actions, context);
  rule.lastFiredAt = Date.now();

  platformBus.emit("automation.rule.fired", { ruleId: rule.id, ruleName: rule.name });
  return true;
}

export function initPropertyAutomation(): void {
  if (initialized) return;
  initialized = true;
  platformBus.emit("automation.property.initialized", { ruleCount: BUILT_IN_RULES.length });
}
