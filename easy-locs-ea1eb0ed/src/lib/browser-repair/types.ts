export type RepairSeverity = "critical" | "warning" | "info";
export type RepairStatus = "pass" | "fail" | "degraded" | "partial" | "fixed" | "skipped";

export interface StepResult {
  key: string;
  status: "pass" | "fail";
  elapsedMs: number;
  details?: Record<string, unknown>;
}

export interface BrowserRepairScenario {
  key: string;
  pageKey: string;
  flowKey: string;
  area: string;
  scope: string;
  description: string;
  severityIfFail: RepairSeverity;
  canAutoFix: boolean;
  steps: { key: string; description: string }[];
}
