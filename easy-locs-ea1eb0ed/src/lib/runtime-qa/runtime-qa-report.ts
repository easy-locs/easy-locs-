import type { RuntimeQaScenarioResult } from "@/lib/runtime-qa/types";

export function buildRuntimeQaReport(results: RuntimeQaScenarioResult[]) {
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const degradedCount = results.filter((r) => r.status === "degraded" || r.status === "partial").length;
  const fixedCount = results.filter((r) => r.status === "fixed" || r.autoFixApplied).length;
  const criticalCount = results.filter((r) => r.severity === "critical" && r.status !== "pass").length;
  const warningCount = results.filter((r) => r.severity === "warning" && r.status !== "pass").length;

  const byModule: Record<string, number> = {};
  const byIssueType: Record<string, number> = {};
  const byRoute: Record<string, number> = {};

  let totalSteps = 0;
  let totalStepMs = 0;

  for (const r of results) {
    byModule[r.moduleKey] = (byModule[r.moduleKey] ?? 0) + 1;
    byRoute[r.routeKey] = (byRoute[r.routeKey] ?? 0) + (r.status !== "pass" ? 1 : 0);
    if (r.issueType) byIssueType[r.issueType] = (byIssueType[r.issueType] ?? 0) + 1;
    totalSteps += r.steps.length || 1;
    totalStepMs += r.durationMs;
  }

  return {
    total_modules: [...new Set(results.map((r) => r.moduleKey))].length,
    total_scenarios: results.length,
    total_steps: totalSteps,
    pass_count: passCount,
    fail_count: failCount,
    degraded_count: degradedCount,
    fixed_count: fixedCount,
    critical_count: criticalCount,
    warning_count: warningCount,
    avg_step_ms: totalSteps > 0 ? Math.round(totalStepMs / totalSteps) : 0,
    by_module: byModule,
    by_issue_type: byIssueType,
    by_route: byRoute,
  };
}
