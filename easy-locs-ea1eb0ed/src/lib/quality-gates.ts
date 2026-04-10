import { addErrorReporter, type ClassifiedError } from "./error-handling";

export interface QualityScore {
  module: string;
  score: number;
  maxScore: number;
  checks: QualityCheck[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface QualityReport {
  timestamp: string;
  overallScore: number;
  modules: QualityScore[];
  errors: ErrorSnapshot[];
}

interface ErrorSnapshot {
  domain: string;
  severity: string;
  message: string;
  timestamp: number;
}

const ERROR_LOG: ErrorSnapshot[] = [];
const MAX_ERROR_LOG = 500;

let reporterRegistered = false;

export function initQualityGates() {
  if (reporterRegistered) return;
  reporterRegistered = true;

  addErrorReporter((classified: ClassifiedError) => {
    ERROR_LOG.push({
      domain: classified.domain,
      severity: classified.severity,
      message: classified.original.message,
      timestamp: Date.now(),
    });
    if (ERROR_LOG.length > MAX_ERROR_LOG) {
      ERROR_LOG.splice(0, ERROR_LOG.length - MAX_ERROR_LOG);
    }
  });
}

export function getErrorLog(): readonly ErrorSnapshot[] {
  return ERROR_LOG;
}

export function getErrorSummary() {
  const now = Date.now();
  const last5min = ERROR_LOG.filter(e => now - e.timestamp < 5 * 60 * 1000);
  const last1h = ERROR_LOG.filter(e => now - e.timestamp < 60 * 60 * 1000);

  const byDomain: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const e of last1h) {
    byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
  }

  return {
    last5min: last5min.length,
    last1h: last1h.length,
    total: ERROR_LOG.length,
    byDomain,
    bySeverity,
    healthStatus: last5min.length === 0 ? "healthy" as const
      : last5min.length < 5 ? "degraded" as const
      : "unhealthy" as const,
  };
}

const ARCHITECTURE_RULES = [
  {
    id: "no-direct-db-in-ui",
    description: "UI components must not call db() directly — use services",
    severity: "critical" as const,
  },
  {
    id: "no-any-in-services",
    description: "Service return types must be concrete, not any/unknown",
    severity: "warning" as const,
  },
  {
    id: "no-circular-deps",
    description: "No circular dependencies between modules",
    severity: "critical" as const,
  },
  {
    id: "no-raw-error-messages",
    description: "Never show raw error.message to users — use classifyError",
    severity: "warning" as const,
  },
  {
    id: "canonical-types-only",
    description: "Use canonical types (CanonicalPlace, GeoEntity, etc.) — no parallel models",
    severity: "critical" as const,
  },
  {
    id: "i18n-required",
    description: "All user-facing strings must use t() — no hardcoded text",
    severity: "warning" as const,
  },
  {
    id: "service-layer-required",
    description: "Each domain must have a dedicated service file",
    severity: "info" as const,
  },
  {
    id: "no-dead-routes",
    description: "All routes must resolve to valid components",
    severity: "critical" as const,
  },
] as const;

export function getArchitectureRules() {
  return ARCHITECTURE_RULES;
}

export function runModuleQualityCheck(
  module: string,
  checks: Array<{ name: string; test: () => boolean; severity: QualityCheck["severity"]; message: string }>,
): QualityScore {
  const results: QualityCheck[] = checks.map(check => ({
    name: check.name,
    passed: check.test(),
    severity: check.severity,
    message: check.message,
  }));

  const maxScore = results.length * 10;
  const score = results.reduce((acc, r) => {
    if (r.passed) return acc + 10;
    if (r.severity === "critical") return acc;
    if (r.severity === "warning") return acc + 3;
    return acc + 7;
  }, 0);

  return { module, score, maxScore, checks: results };
}

const PERF_BUDGETS = {
  maxBundleSizeKB: 500,
  maxPageLoadMs: 3000,
  maxInteractionDelayMs: 100,
  maxListRenderItems: 100,
  maxModalDepth: 3,
  maxImageSizeKB: 200,
  maxConcurrentRequests: 6,
} as const;

export function getPerfBudgets() {
  return { ...PERF_BUDGETS };
}

export type PerfBudgetKey = keyof typeof PERF_BUDGETS;

export function checkPerfBudget(key: PerfBudgetKey, value: number): boolean {
  return value <= PERF_BUDGETS[key];
}
