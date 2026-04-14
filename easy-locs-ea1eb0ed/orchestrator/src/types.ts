export type AgentRole =
  | "chief-architect"
  | "coding"
  | "qa-validation"
  | "supabase"
  | "deploy"
  | "observability";

export type TaskStatus =
  | "pending"
  | "decomposing"
  | "in-progress"
  | "awaiting-review"
  | "approved"
  | "merged"
  | "failed"
  | "cancelled";

export type SubtaskStatus =
  | "pending"
  | "assigned"
  | "in-progress"
  | "completed"
  | "failed"
  | "blocked"
  | "skipped";

export interface Task {
  id: string;
  githubIssueNumber: number;
  githubRepo: string;
  title: string;
  body: string;
  labels: string[];
  status: TaskStatus;
  subtasks: Subtask[];
  prNumber?: number;
  branchName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  assignedAgent: AgentRole;
  status: SubtaskStatus;
  result?: SubtaskResult;
  dependencies: string[];
  createdAt: string;
  completedAt?: string;
}

export interface SubtaskResult {
  success: boolean;
  summary: string;
  filesModified?: string[];
  prComments?: string[];
  errors?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  agentId: AgentRole;
  action: string;
  details: Record<string, unknown>;
  taskId?: string;
  subtaskId?: string;
  rationale: string;
  durationMs?: number;
  tokenUsage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  estimatedCostUsd: number;
}

export interface CostBudget {
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  currentDailyUsd: number;
  currentMonthlyUsd: number;
  lastResetDaily: string;
  lastResetMonthly: string;
}

export interface AgentToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface WebhookEvent {
  type: "issue_opened" | "issue_comment" | "pr_opened" | "pr_review" | "pr_merged";
  payload: Record<string, unknown>;
  repo: string;
  sender: string;
  timestamp: string;
}

export interface AgentContext {
  task: Task;
  subtask: Subtask;
  repoRules: Record<string, string>;
  recentAuditLog: AuditLogEntry[];
}

export interface OrchestratorConfig {
  githubAppId: string;
  githubPrivateKey: string;
  githubInstallationId: string;
  githubWebhookSecret: string;
  githubOwner: string;
  githubRepo: string;
  openaiApiKey: string;
  openaiModel: string;
  port: number;
  adminToken: string;
  costBudget: CostBudget;
  vercelToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  supabaseProjectRef?: string;
  supabaseManagementToken?: string;
}
