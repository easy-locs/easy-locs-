export interface AuditViolation {
  file: string;
  line: number;
  message: string;
  severity: "critical" | "high" | "medium";
  code?: string;
}

export interface AuditResult {
  system: string;
  status: "PASS" | "PARTIAL" | "FAIL" | "MISSING";
  totalViolations: number;
  criticalViolations: number;
  violations: AuditViolation[];
  summary: string;
}

export type SystemStatus = "PASS" | "PARTIAL" | "FAIL" | "MISSING";
export type RouteStatus = "PASS" | "FAIL";

export interface ControlBoardReport {
  timestamp: string;
  systems: Record<string, SystemStatus>;
  routes: Record<string, RouteStatus>;
  criticalFlows: Record<string, RouteStatus>;
  counts: {
    runtimeCrashesRemaining: number;
    duplicateUIConflicts: number;
    technicalLeaks: number;
    directBackendViolations: number;
    i18nViolations: number;
    unstableRoutes: number;
  };
  audits: AuditResult[];
}
