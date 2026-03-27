export type RuntimeQaStatus =
  | "pass"
  | "fail"
  | "degraded"
  | "partial"
  | "fixed"
  | "skipped";

export type RuntimeQaSeverity = "critical" | "warning" | "info";

export interface RuntimeQaStepResult {
  key: string;
  status: "pass" | "fail";
  elapsedMs: number;
  details?: Record<string, unknown>;
}

export interface RuntimeQaScenarioResult {
  key: string;
  moduleKey: string;
  routeKey: string;
  area: string;
  status: RuntimeQaStatus;
  severity: RuntimeQaSeverity;
  issueType?: string;
  summary?: string;
  rootCause?: string;
  autoFixApplied: boolean;
  fixSummary?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  steps: RuntimeQaStepResult[];
}

export interface RuntimeQaDefinition {
  key: string;
  moduleKey: string;
  routeKey: string;
  area: string;
  scope: string;
  description: string;
  severityIfFail: RuntimeQaSeverity;
  canAutoFix: boolean;
  steps: { key: string; description: string }[];
}
