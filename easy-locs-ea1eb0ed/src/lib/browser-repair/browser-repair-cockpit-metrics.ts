export function buildBrowserRepairCockpitMetrics(
  repairRuns: any[],
  repairIssues: any[],
  watchdog: any[]
) {
  const latestRun = repairRuns[0];

  return {
    latestRunScenarios: latestRun?.scenario_count ?? 0,
    latestRunPass: latestRun?.pass_count ?? 0,
    latestRunFail: latestRun?.fail_count ?? 0,
    latestRunFixed: latestRun?.fixed_count ?? 0,
    latestRunWarnings: latestRun?.warning_count ?? 0,
    latestRunCritical: latestRun?.critical_count ?? 0,
    latestRunDegraded: latestRun?.degraded_count ?? 0,

    totalIssues: repairIssues.length,
    criticalIssues: repairIssues.filter((x: any) => x.severity === "critical").length,
    fixedIssues: repairIssues.filter((x: any) => x.auto_fix_applied).length,
    openIssues: repairIssues.filter((x: any) => !x.auto_fix_applied).length,

    failingPages: watchdog.filter((x: any) => x.current_status === "failing").length,
    healthyPages: watchdog.filter((x: any) => x.current_status === "ok").length,
    pagesFailingMoreThan2: watchdog.filter((x: any) => (x.consecutive_failures ?? 0) > 2).length,
  };
}
