import {
  type SupportIssueCategory,
  type RoutingTarget,
  type SupportUrgency,
  ROUTING_TARGET,
  URGENCY_BY_CATEGORY,
} from "./canonical-support-taxonomy";
import type { AIRoutingDecision } from "./support-types";

interface DecisionContext {
  category: SupportIssueCategory;
  confidence: number;
  user_id: string;
  shop_id: string | null;
  order_id: string | null;
  has_previous_tickets: boolean;
  previous_ticket_count: number;
  shop_quality_score: number | null;
  is_repeat_complaint: boolean;
  amount_involved: number | null;
  fraud_risk_score: number;
}

interface DecisionRule {
  id: string;
  priority: number;
  condition: (ctx: DecisionContext) => boolean;
  target: RoutingTarget;
  reason: string;
  risk_level: "none" | "low" | "medium" | "high";
}

const DECISION_RULES: DecisionRule[] = [
  {
    id: "fraud_block",
    priority: 1,
    condition: (ctx) => ctx.fraud_risk_score > 0.8,
    target: ROUTING_TARGET.BLOCKED,
    reason: "High fraud risk detected — actions blocked pending review",
    risk_level: "high",
  },
  {
    id: "fraud_escalate",
    priority: 2,
    condition: (ctx) =>
      ctx.category === "fraud_suspicion" || ctx.fraud_risk_score > 0.5,
    target: ROUTING_TARGET.ADMIN_ESCALATION,
    reason: "Fraud suspicion requires platform admin review",
    risk_level: "high",
  },
  {
    id: "platform_escalation",
    priority: 3,
    condition: (ctx) => ctx.category === "platform_escalation",
    target: ROUTING_TARGET.ADMIN_ESCALATION,
    reason: "Platform-level issue requires admin intervention",
    risk_level: "medium",
  },
  {
    id: "repeated_unresolved",
    priority: 4,
    condition: (ctx) =>
      ctx.is_repeat_complaint && ctx.previous_ticket_count >= 3,
    target: ROUTING_TARGET.ADMIN_ESCALATION,
    reason: "Repeated unresolved complaints — escalated for admin review",
    risk_level: "medium",
  },
  {
    id: "high_value_refund",
    priority: 5,
    condition: (ctx) =>
      ctx.category === "refund_request" &&
      ctx.amount_involved !== null &&
      ctx.amount_involved > 500,
    target: ROUTING_TARGET.ADMIN_ESCALATION,
    reason: "High-value refund requires admin approval",
    risk_level: "medium",
  },
  {
    id: "shop_quality_poor_escalate",
    priority: 6,
    condition: (ctx) =>
      ctx.shop_quality_score !== null &&
      ctx.shop_quality_score < 0.3 &&
      ctx.is_repeat_complaint,
    target: ROUTING_TARGET.ADMIN_ESCALATION,
    reason: "Low-quality shop with repeated complaints — admin review needed",
    risk_level: "medium",
  },
  {
    id: "shop_operational_transfer",
    priority: 10,
    condition: (ctx) =>
      ctx.shop_id !== null &&
      [
        "missing_item",
        "wrong_item",
        "quality_complaint",
        "delay",
        "delivery_issue",
        "booking_issue",
        "cancellation",
        "shop_complaint",
      ].includes(ctx.category),
    target: ROUTING_TARGET.SHOP_TRANSFER,
    reason: "Operational issue — transferring directly to the shop",
    risk_level: "low",
  },
  {
    id: "driver_transfer",
    priority: 11,
    condition: (ctx) => ctx.category === "driver_issue" && ctx.shop_id !== null,
    target: ROUTING_TARGET.SHOP_TRANSFER,
    reason: "Driver issue — routing to the shop managing the delivery",
    risk_level: "low",
  },
  {
    id: "ai_order_status",
    priority: 20,
    condition: (ctx) => ctx.category === "order_status",
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "Order status inquiry — AI can answer directly",
    risk_level: "none",
  },
  {
    id: "ai_account_help",
    priority: 21,
    condition: (ctx) => ctx.category === "account_issue",
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "Account help — AI can guide the user",
    risk_level: "none",
  },
  {
    id: "ai_technical_help",
    priority: 22,
    condition: (ctx) => ctx.category === "technical_app_issue",
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "Technical issue — AI can troubleshoot",
    risk_level: "none",
  },
  {
    id: "ai_property_info",
    priority: 23,
    condition: (ctx) =>
      ctx.category === "property_issue" && ctx.shop_id === null,
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "Property inquiry without specific shop — AI handles directly",
    risk_level: "none",
  },
  {
    id: "ai_simple_refund",
    priority: 24,
    condition: (ctx) =>
      ctx.category === "refund_request" &&
      ctx.amount_involved !== null &&
      ctx.amount_involved <= 25 &&
      !ctx.is_repeat_complaint,
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "Low-value refund — AI can process directly",
    risk_level: "low",
  },
  {
    id: "payment_ticket",
    priority: 30,
    condition: (ctx) =>
      ctx.category === "payment_issue" && ctx.shop_id === null,
    target: ROUTING_TARGET.TICKET_FALLBACK,
    reason: "Payment issue without shop context — creating support ticket",
    risk_level: "medium",
  },
  {
    id: "suspicious_ticket",
    priority: 31,
    condition: (ctx) => ctx.category === "suspicious_behavior",
    target: ROUTING_TARGET.TICKET_FALLBACK,
    reason: "Suspicious behavior reported — logged for investigation",
    risk_level: "medium",
  },
  {
    id: "low_confidence_ticket",
    priority: 40,
    condition: (ctx) => ctx.confidence < 0.5,
    target: ROUTING_TARGET.TICKET_FALLBACK,
    reason: "Low classification confidence — creating ticket for manual review",
    risk_level: "low",
  },
  {
    id: "default_ai",
    priority: 100,
    condition: () => true,
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "General inquiry — AI handles directly",
    risk_level: "none",
  },
];

export function makeRoutingDecision(ctx: DecisionContext): AIRoutingDecision {
  const sortedRules = [...DECISION_RULES].sort(
    (a, b) => a.priority - b.priority,
  );

  for (const rule of sortedRules) {
    if (rule.condition(ctx)) {
      return {
        target: rule.target,
        reason: rule.reason,
        can_ai_resolve: rule.target === ROUTING_TARGET.AI_DIRECT,
        requires_shop: rule.target === ROUTING_TARGET.SHOP_TRANSFER,
        requires_admin: rule.target === ROUTING_TARGET.ADMIN_ESCALATION,
        risk_level: rule.risk_level,
        blocked_reason:
          rule.target === ROUTING_TARGET.BLOCKED ? rule.reason : null,
      };
    }
  }

  return {
    target: ROUTING_TARGET.AI_DIRECT,
    reason: "No specific rule matched — AI handles directly",
    can_ai_resolve: true,
    requires_shop: false,
    requires_admin: false,
    risk_level: "none",
    blocked_reason: null,
  };
}

export function getUrgency(category: SupportIssueCategory): SupportUrgency {
  return URGENCY_BY_CATEGORY[category] ?? "medium";
}

export function shouldAutoResolve(
  category: SupportIssueCategory,
  confidence: number,
): boolean {
  const autoResolvable: SupportIssueCategory[] = [
    "order_status",
    "account_issue",
    "technical_app_issue",
  ];
  return autoResolvable.includes(category) && confidence >= 0.85;
}

export function shouldEscalateImmediately(
  category: SupportIssueCategory,
  fraudRisk: number,
): boolean {
  if (fraudRisk > 0.5) return true;
  if (category === "fraud_suspicion") return true;
  if (category === "platform_escalation") return true;
  return false;
}

export function calculateShopTransferPriority(
  urgency: SupportUrgency,
  shopQualityScore: number | null,
): number {
  const urgencyWeight: Record<SupportUrgency, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  const base = urgencyWeight[urgency];
  const qualityPenalty =
    shopQualityScore !== null && shopQualityScore < 0.5
      ? 1
      : 0;
  return base + qualityPenalty;
}
