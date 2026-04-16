import type {
  SupportIssueCategory,
  SupportSessionStatus,
  SupportUrgency,
  RoutingTarget,
  SupportChannel,
  AgentType,
} from "./canonical-support-taxonomy";

export interface SupportSession {
  id: string;
  user_id: string;
  channel: SupportChannel;
  status: SupportSessionStatus;
  issue_category: SupportIssueCategory | null;
  urgency: SupportUrgency | null;
  order_id: string | null;
  shop_id: string | null;
  booking_id: string | null;
  routing_target: RoutingTarget | null;
  ai_summary: string | null;
  ai_classification_confidence: number | null;
  language: string;
  ticket_id: string | null;
  resolved_by: "ai" | "shop" | "admin" | "system" | null;
  resolution_summary: string | null;
  shop_transfer_attempts: number;
  shop_response_at: string | null;
  escalation_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface SupportTrace {
  id: string;
  session_id: string;
  event_type: SupportTraceEventType;
  actor: "user" | "ai" | "shop" | "system" | "admin";
  data: Record<string, unknown>;
  created_at: string;
}

export type SupportTraceEventType =
  | "session_started"
  | "user_message"
  | "ai_response"
  | "ai_classification"
  | "routing_decision"
  | "shop_transfer_initiated"
  | "shop_transfer_accepted"
  | "shop_transfer_rejected"
  | "shop_transfer_timeout"
  | "shop_message"
  | "ticket_created"
  | "ticket_updated"
  | "escalation_triggered"
  | "resolution_proposed"
  | "session_resolved"
  | "session_closed"
  | "session_abandoned"
  | "callback_scheduled"
  | "fraud_flag_raised"
  | "sla_warning"
  | "sla_breach";

export interface SupportMessage {
  id: string;
  session_id: string;
  sender: "user" | "ai" | "shop" | "system";
  content: string;
  content_type: "text" | "voice_transcript" | "media" | "system_notice";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ShopTransferPacket {
  session_id: string;
  customer_id: string;
  customer_name: string | null;
  order_id: string | null;
  booking_id: string | null;
  issue_category: SupportIssueCategory;
  summary: string;
  urgency: SupportUrgency;
  transcript_summary: string;
  timestamp: string;
  language: string;
}

export interface AIClassificationResult {
  category: SupportIssueCategory;
  confidence: number;
  urgency: SupportUrgency;
  context_ids: {
    order_id?: string;
    shop_id?: string;
    booking_id?: string;
    payment_id?: string;
  };
  summary: string;
  suggested_response: string | null;
  routing_recommendation: RoutingTarget;
}

export interface AIRoutingDecision {
  target: RoutingTarget;
  reason: string;
  can_ai_resolve: boolean;
  requires_shop: boolean;
  requires_admin: boolean;
  risk_level: "none" | "low" | "medium" | "high";
  blocked_reason: string | null;
}

export interface ShopQualityScore {
  shop_id: string;
  response_rate: number;
  avg_response_time_minutes: number;
  complaint_rate: number;
  refund_rate: number;
  fraud_flags: number;
  overall_score: number;
  last_updated: string;
}

export interface SupportAgentConfig {
  type: AgentType;
  enabled: boolean;
  interval_seconds: number;
  last_run_at: string | null;
  error_count: number;
  max_errors_before_disable: number;
}

export interface LearningInsight {
  id: string;
  insight_type: "routing_improvement" | "taxonomy_refinement" | "product_issue" | "shop_pattern" | "fraud_pattern";
  category: SupportIssueCategory | null;
  description: string;
  evidence_count: number;
  suggested_action: string;
  priority: SupportUrgency;
  status: "pending" | "reviewed" | "applied" | "dismissed";
  created_at: string;
}
