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
  {
    id: "no-catch-any",
    description: "Never use catch(e: any) — use catch(e) with instanceof Error check",
    severity: "warning" as const,
  },
  {
    id: "no-as-any-payloads",
    description: "Platform bus payloads must use typed interfaces — never cast as any",
    severity: "critical" as const,
  },
  {
    id: "no-direct-supabase",
    description: "Never import supabase client directly in components — use db() from services/db.ts",
    severity: "critical" as const,
  },
  {
    id: "error-boundary-required",
    description: "All 5 pillar routes must be wrapped in FeatureErrorBoundary",
    severity: "critical" as const,
  },
  {
    id: "no-usestate-any",
    description: "useState<any> is prohibited — use concrete types or Record<string, unknown>",
    severity: "warning" as const,
  },
  {
    id: "suspense-fallback-required",
    description: "All lazy-loaded routes must have Suspense fallback with loading skeleton",
    severity: "warning" as const,
  },
  {
    id: "no-unsafe-casts",
    description: "Never use 'as unknown as' casts — use proper mapper functions",
    severity: "critical" as const,
  },
  {
    id: "resilience-guards-required",
    description: "Payment/booking flows must use withDoubleClickGuard or withSessionGuard",
    severity: "warning" as const,
  },
  {
    id: "workflow-required-for-critical-flows",
    description: "Critical business flows (create, publish, lease, payment) must use workflow engine",
    severity: "warning" as const,
  },
  {
    id: "no-parallel-taxonomy",
    description: "All category/type definitions must derive from canonical taxonomy — no local enums",
    severity: "critical" as const,
  },
  {
    id: "data-contract-stability",
    description: "Service return types must match canonical interfaces — snake_case mapped to camelCase",
    severity: "critical" as const,
  },
  {
    id: "country-rules-required",
    description: "Multi-country features must use getCountryRules() — no hardcoded locale assumptions",
    severity: "warning" as const,
  },
  {
    id: "me-wallet-separation",
    description: "Me = cockpit/overview only. All financial detail stays in Wallet",
    severity: "critical" as const,
  },
  {
    id: "offline-recovery-required",
    description: "Forms with user input must persist draft state for offline recovery",
    severity: "info" as const,
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
  maxCheckoutMs: 5000,
  maxMapLoadMs: 2000,
  maxOrbitThreadLoadMs: 1500,
  maxDashboardRenderMs: 2500,
  maxModalOpenMs: 300,
  maxLongListRenderMs: 500,
} as const;

export function getPerfBudgets() {
  return { ...PERF_BUDGETS };
}

export type PerfBudgetKey = keyof typeof PERF_BUDGETS;

export function checkPerfBudget(key: PerfBudgetKey, value: number): boolean {
  return value <= PERF_BUDGETS[key];
}

export type VerticalId = "dashboard" | "radar" | "orbit" | "wallet" | "me" | "real_estate" | "marketplace" | "mobility" | "food" | "stay";

export interface VerticalHealthScore {
  vertical: VerticalId;
  overall: number;
  breakdown: {
    performance: number;
    dataQuality: number;
    uxQuality: number;
    stability: number;
    testCoverage: number;
  };
  status: "healthy" | "degraded" | "unhealthy";
  issues: string[];
  lastCheckedAt: number;
}

export function computeVerticalHealth(
  vertical: VerticalId,
  metrics: {
    errorRate5min?: number;
    avgLoadMs?: number;
    dataCompleteness?: number;
    renderIssues?: number;
    crashCount?: number;
  },
): VerticalHealthScore {
  const performance = Math.max(0, 100 - ((metrics.avgLoadMs ?? 0) / 30));
  const dataQuality = (metrics.dataCompleteness ?? 100);
  const uxQuality = Math.max(0, 100 - ((metrics.renderIssues ?? 0) * 10));
  const stability = Math.max(0, 100 - ((metrics.crashCount ?? 0) * 20) - ((metrics.errorRate5min ?? 0) * 5));
  const testCoverage = 50;

  const overall = Math.round(
    performance * 0.25 + dataQuality * 0.25 + uxQuality * 0.2 + stability * 0.2 + testCoverage * 0.1
  );

  const issues: string[] = [];
  if (performance < 60) issues.push("Performance below budget");
  if (dataQuality < 70) issues.push("Data quality issues detected");
  if (uxQuality < 70) issues.push("UI rendering issues");
  if (stability < 60) issues.push("Stability concerns — high error rate");

  return {
    vertical,
    overall,
    breakdown: { performance, dataQuality, uxQuality, stability, testCoverage },
    status: overall >= 80 ? "healthy" : overall >= 50 ? "degraded" : "unhealthy",
    issues,
    lastCheckedAt: Date.now(),
  };
}

export function computeGlobalHealthScore(verticals: VerticalHealthScore[]): {
  score: number;
  status: "healthy" | "degraded" | "unhealthy";
  weakestVertical: string;
  strongestVertical: string;
} {
  if (verticals.length === 0) return { score: 0, status: "unhealthy", weakestVertical: "none", strongestVertical: "none" };

  const avg = Math.round(verticals.reduce((s, v) => s + v.overall, 0) / verticals.length);
  const sorted = [...verticals].sort((a, b) => a.overall - b.overall);

  return {
    score: avg,
    status: avg >= 80 ? "healthy" : avg >= 50 ? "degraded" : "unhealthy",
    weakestVertical: sorted[0].vertical,
    strongestVertical: sorted[sorted.length - 1].vertical,
  };
}
