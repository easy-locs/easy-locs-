/**
 * Browser Repair Report — builds final report_json from scenario results
 */
import type { ScenarioResult, RepairRunReport } from "./browser-repair-types";

export function buildRepairReport(results: ScenarioResult[]): RepairRunReport {
  const topIssueTypes: Record<string, number> = {};
  const topPages: Record<string, number> = {};
  let totalSteps = 0;
  let totalStepMs = 0;
  let deadRoutes = 0;
  let deadClicks = 0;
  let realtimeFailures = 0;
  let chainConflicts = 0;

  for (const r of results) {
    totalSteps += r.steps?.length ?? 1;
    totalStepMs += r.durationMs;

    if (r.status !== "pass") {
      topPages[r.page] = (topPages[r.page] ?? 0) + 1;
      if (r.issueType) topIssueTypes[r.issueType] = (topIssueTypes[r.issueType] ?? 0) + 1;
      if (r.issueType === "broken_route") deadRoutes++;
      if (r.issueType === "dead_click") deadClicks++;
      if (r.issueType === "realtime_not_received") realtimeFailures++;
      if (r.issueType === "duplicate_runtime_chain") chainConflicts++;
    }
  }

  return {
    total_scenarios: results.length,
    total_steps: totalSteps,
    pass_count: results.filter(r => r.status === "pass").length,
    fail_count: results.filter(r => r.status === "fail").length,
    fixed_count: results.filter(r => r.status === "fixed" || r.autoFixApplied).length,
    warning_count: results.filter(r => r.severity === "warning" && r.status !== "pass").length,
    top_issue_types: topIssueTypes,
    top_pages: topPages,
    avg_step_ms: totalSteps > 0 ? Math.round(totalStepMs / totalSteps) : 0,
    total_runtime_chain_conflicts_found: chainConflicts,
    total_dead_routes_found: deadRoutes,
    total_dead_clicks_found: deadClicks,
    total_realtime_failures_found: realtimeFailures,
  };
}
