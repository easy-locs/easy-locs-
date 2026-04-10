/**
 * domain-health-reporter — Aggregates health status across all domains.
 * Provides a unified report for runtime supervision.
 */
import { getFlowReport, getFlowsByStatus, runDomainHealthScan } from "./flow-completeness-validator";

export type DomainReport = {
  domain: string;
  healthyFlows: number;
  incompleteFlows: number;
  brokenFlows: number;
  overallStatus: "green" | "yellow" | "red";
  issues: string[];
};

export function generateFullHealthReport(): DomainReport[] {
  const scan = runDomainHealthScan();
  const reports: DomainReport[] = [];

  for (const [domain, counts] of Object.entries(scan)) {
    const domainFlows = getFlowReport().filter((f) => f.domain === domain);
    const issues = domainFlows.flatMap((f) => f.issues);

    let overallStatus: DomainReport["overallStatus"] = "green";
    if (counts.broken > 0) overallStatus = "red";
    else if (counts.incomplete > 0) overallStatus = "yellow";

    reports.push({
      domain,
      healthyFlows: counts.healthy,
      incompleteFlows: counts.incomplete,
      brokenFlows: counts.broken,
      overallStatus,
      issues,
    });
  }

  return reports.sort((a, b) => {
    const priority = { red: 0, yellow: 1, green: 2 };
    return priority[a.overallStatus] - priority[b.overallStatus];
  });
}

export function getUnhealthyDomains(): DomainReport[] {
  return generateFullHealthReport().filter((r) => r.overallStatus !== "green");
}

export function logHealthReport() {
  const report = generateFullHealthReport();
  const broken = getFlowsByStatus("broken");
  const incomplete = getFlowsByStatus("incomplete");

  if (broken.length > 0) {
    console.error("[health] BROKEN flows:", broken.map((f) => `${f.domain}/${f.flowName}`));
  }
  if (incomplete.length > 0) {
    console.warn("[health] Incomplete flows:", incomplete.map((f) => `${f.domain}/${f.flowName}`));
  }

  console.log(
    "[health] Domain summary:",
    report.map((r) => `${r.domain}:${r.overallStatus}`).join(", "),
  );
}
