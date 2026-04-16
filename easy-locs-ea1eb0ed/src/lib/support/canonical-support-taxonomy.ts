export const SUPPORT_ISSUE_CATEGORIES = {
  ORDER_STATUS: "order_status",
  DELAY: "delay",
  MISSING_ITEM: "missing_item",
  WRONG_ITEM: "wrong_item",
  QUALITY_COMPLAINT: "quality_complaint",
  REFUND_REQUEST: "refund_request",
  PAYMENT_ISSUE: "payment_issue",
  DELIVERY_ISSUE: "delivery_issue",
  SUSPICIOUS_BEHAVIOR: "suspicious_behavior",
  FRAUD_SUSPICION: "fraud_suspicion",
  SHOP_COMPLAINT: "shop_complaint",
  TECHNICAL_APP_ISSUE: "technical_app_issue",
  PLATFORM_ESCALATION: "platform_escalation",
  BOOKING_ISSUE: "booking_issue",
  PROPERTY_ISSUE: "property_issue",
  DRIVER_ISSUE: "driver_issue",
  ACCOUNT_ISSUE: "account_issue",
  CANCELLATION: "cancellation",
} as const;

export type SupportIssueCategory =
  (typeof SUPPORT_ISSUE_CATEGORIES)[keyof typeof SUPPORT_ISSUE_CATEGORIES];

export const ISSUE_CATEGORY_LABELS: Record<SupportIssueCategory, string> = {
  order_status: "Order Status",
  delay: "Delay",
  missing_item: "Missing Item",
  wrong_item: "Wrong Item",
  quality_complaint: "Quality Complaint",
  refund_request: "Refund Request",
  payment_issue: "Payment Issue",
  delivery_issue: "Delivery Issue",
  suspicious_behavior: "Suspicious Behavior",
  fraud_suspicion: "Fraud Suspicion",
  shop_complaint: "Shop Complaint",
  technical_app_issue: "Technical / App Issue",
  platform_escalation: "Platform Escalation",
  booking_issue: "Booking Issue",
  property_issue: "Property Issue",
  driver_issue: "Driver Issue",
  account_issue: "Account Issue",
  cancellation: "Cancellation",
};

export const SUPPORT_SESSION_STATUS = {
  ACTIVE: "active",
  AI_HANDLING: "ai_handling",
  TRANSFERRING_TO_SHOP: "transferring_to_shop",
  WITH_SHOP: "with_shop",
  SHOP_UNREACHABLE: "shop_unreachable",
  TICKET_CREATED: "ticket_created",
  ESCALATED_ADMIN: "escalated_admin",
  RESOLVED: "resolved",
  CLOSED: "closed",
  ABANDONED: "abandoned",
} as const;

export type SupportSessionStatus =
  (typeof SUPPORT_SESSION_STATUS)[keyof typeof SUPPORT_SESSION_STATUS];

export const SUPPORT_URGENCY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type SupportUrgency =
  (typeof SUPPORT_URGENCY)[keyof typeof SUPPORT_URGENCY];

export const ROUTING_TARGET = {
  AI_DIRECT: "ai_direct",
  SHOP_TRANSFER: "shop_transfer",
  TICKET_FALLBACK: "ticket_fallback",
  ADMIN_ESCALATION: "admin_escalation",
  CALLBACK_SCHEDULED: "callback_scheduled",
  BLOCKED: "blocked",
} as const;

export type RoutingTarget =
  (typeof ROUTING_TARGET)[keyof typeof ROUTING_TARGET];

export const SUPPORT_CHANNEL = {
  CHAT: "chat",
  VOICE: "voice",
} as const;

export type SupportChannel =
  (typeof SUPPORT_CHANNEL)[keyof typeof SUPPORT_CHANNEL];

export const AGENT_TYPE = {
  SUPPORT: "support",
  DISPUTE: "dispute",
  SHOP_MONITOR: "shop_monitor",
  PAYMENT_ANOMALY: "payment_anomaly",
  QUALITY_ANALYTICS: "quality_analytics",
  LEARNING: "learning",
  REPAIR: "repair",
} as const;

export type AgentType = (typeof AGENT_TYPE)[keyof typeof AGENT_TYPE];

export const SLA_MINUTES: Record<SupportUrgency, number> = {
  low: 1440,
  medium: 240,
  high: 60,
  critical: 15,
};

export const URGENCY_BY_CATEGORY: Record<SupportIssueCategory, SupportUrgency> = {
  order_status: "low",
  delay: "medium",
  missing_item: "high",
  wrong_item: "high",
  quality_complaint: "medium",
  refund_request: "medium",
  payment_issue: "critical",
  delivery_issue: "high",
  suspicious_behavior: "high",
  fraud_suspicion: "critical",
  shop_complaint: "medium",
  technical_app_issue: "low",
  platform_escalation: "critical",
  booking_issue: "medium",
  property_issue: "medium",
  driver_issue: "high",
  account_issue: "medium",
  cancellation: "medium",
};
