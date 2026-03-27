export function summarizeRepairRun(run: any) {
  const report = run?.report_json || {};
  return {
    scenarios: report.total_scenarios || 0,
    pass: report.pass_count || 0,
    fail: report.fail_count || 0,
    fixed: report.fixed_count || 0,
    warning: report.warning_count || 0,
    topIssueTypes: report.top_issue_types || {},
    topPages: report.top_pages || {},
    topAreas: report.top_areas || {},
  };
}

export const ROUTE_GROUP_MAP: Record<string, string> = {
  "/orbit": "orbit",
  "/wallet": "wallet",
  "/dashboard": "dashboard",
  "/travel": "travel",
  "/marketplace": "marketplace",
  "/map": "radar",
  "/onboarding": "onboarding",
};
