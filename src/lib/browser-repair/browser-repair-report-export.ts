export function summarizeRepairRun(run: any) {
  const report = run?.report_json || {};

  return {
    scenarios: report.total_scenarios || 0,
    totalSteps: report.total_steps || 0,
    pass: report.pass_count || 0,
    fail: report.fail_count || 0,
    fixed: report.fixed_count || 0,
    warning: report.warning_count || 0,
    critical: report.critical_count || 0,
    degraded: report.degraded_count || 0,
    topIssueTypes: report.top_issue_types || {},
    topPages: report.top_pages || {},
    topAreas: report.top_areas || {},
    avgStepMs: report.avg_step_ms || 0,
  };
}
