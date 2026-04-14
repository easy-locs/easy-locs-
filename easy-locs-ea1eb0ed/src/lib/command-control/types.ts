export type EmailPriority = "critical" | "high" | "medium" | "low";
export type EmailTaskType = "feature" | "bug" | "refactor" | "docs" | "test" | "task";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type AgentActionStatus = "running" | "completed" | "failed" | "cancelled";
export type MonitoringLevel = 1 | 2 | 3;
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "open" | "acknowledged" | "resolved" | "dismissed";
export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
export type RiskAssessment = "low" | "medium" | "high" | "critical";
export type AuditActorType = "agent" | "human" | "system" | "cron";

export interface ParsedEmail {
  title: string;
  description: string;
  pillar: string;
  priority: EmailPriority;
  type: EmailTaskType;
  labels: string[];
}

export interface CommandEmail {
  id: string;
  from_email: string;
  subject: string;
  raw_body: string;
  parsed_title: string | null;
  parsed_description: string | null;
  parsed_pillar: string | null;
  parsed_priority: EmailPriority;
  parsed_type: EmailTaskType;
  github_issue_number: number | null;
  github_issue_url: string | null;
  status: "received" | "parsed" | "issue_created" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  preview_url: string | null;
  diff_summary: string | null;
  risk_assessment: RiskAssessment;
  agent_name: string | null;
  status: ApprovalStatus;
  approval_token: string;
  reviewer_email: string | null;
  reviewer_feedback: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: string;
  agent_name: string;
  action_type: string;
  description: string;
  status: AgentActionStatus;
  pr_number: number | null;
  branch_name: string | null;
  tokens_consumed: number;
  cost_usd: number;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface MonitoringFinding {
  id: string;
  level: MonitoringLevel;
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  source_engine: string | null;
  finding_data: Record<string, unknown>;
  github_issue_number: number | null;
  github_issue_url: string | null;
  status: FindingStatus;
  auto_created: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  event_type: string;
  actor_type: AuditActorType;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  rollback_tag: string | null;
  created_at: string;
}

export interface SystemHealthSnapshot {
  id: string;
  component: string;
  status: HealthStatus;
  response_time_ms: number | null;
  details: Record<string, unknown>;
  checked_at: string;
}

export interface CostTrackingEntry {
  id: string;
  agent_name: string;
  date: string;
  tokens_input: number;
  tokens_output: number;
  total_tokens: number;
  cost_usd: number;
  api_calls: number;
  model_name: string | null;
  created_at: string;
}

export interface RollbackPoint {
  id: string;
  change_type: string;
  change_id: string;
  git_tag: string | null;
  git_commit_sha: string | null;
  deployment_id: string | null;
  description: string;
  can_rollback: boolean;
  rolled_back: boolean;
  rolled_back_at: string | null;
  created_at: string;
}

export interface DashboardSummary {
  activeAgents: AgentAction[];
  pendingApprovals: ApprovalRequest[];
  recentFindings: MonitoringFinding[];
  healthSnapshots: SystemHealthSnapshot[];
  costSummary: { agent: string; totalCost: number; totalTokens: number }[];
  auditLogRecent: AuditLogEntry[];
  engineScores: { engine: string; score: number; trend: string }[];
}
