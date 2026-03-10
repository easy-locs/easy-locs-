import type { AuditIssue } from "../types";
import { getMonitoringEvents } from "@/lib/monitoring";

/** Technical audit — console errors, performance, broken routes, API issues */
export function runTechnicalAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();
  let id = 0;
  const uid = () => `tech-${++id}`;

  // Pull from monitoring system
  const events = getMonitoringEvents();
  const errors = events.filter((e) => e.type === "error" && !e.resolved);
  const perfIssues = events.filter((e) => e.type === "performance" && !e.resolved);

  if (errors.length > 0) {
    issues.push({
      id: uid(), category: "technical", severity: errors.length > 5 ? "critical" : "high",
      title: `${errors.length} unresolved runtime error(s)`,
      description: `Monitoring has captured ${errors.length} errors: ${errors.slice(0, 3).map(e => e.message).join("; ")}`,
      suggestedFix: "Investigate and fix the runtime errors in the monitoring dashboard.",
      autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
      metadata: { errorCount: errors.length, sample: errors.slice(0, 5) },
    });
  }

  if (perfIssues.length > 0) {
    issues.push({
      id: uid(), category: "technical", severity: "medium",
      title: `${perfIssues.length} performance warning(s)`,
      description: `Long tasks or slow page loads detected: ${perfIssues.slice(0, 2).map(e => e.message).join("; ")}`,
      suggestedFix: "Optimize long-running tasks, reduce bundle size, or lazy-load components.",
      autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
    });
  }

  // Check for React strict mode double renders (dev indicator)
  if (typeof document !== "undefined") {
    // Check bundle size via performance entries
    if ("PerformanceObserver" in window) {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const largeScripts = resources.filter(
        (r) => r.initiatorType === "script" && r.transferSize > 500_000
      );
      if (largeScripts.length > 0) {
        issues.push({
          id: uid(), category: "technical", severity: "medium",
          title: `${largeScripts.length} large script bundle(s)`,
          description: `Scripts over 500KB detected. Large bundles slow initial page load.`,
          suggestedFix: "Split large bundles with dynamic imports and code splitting.",
          autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
          metadata: { scripts: largeScripts.map(s => ({ name: s.name.split("/").pop(), size: Math.round(s.transferSize / 1024) + "KB" })) },
        });
      }
    }

    // Check for duplicate React renders (detect multiple roots)
    const roots = document.querySelectorAll("[data-reactroot], #root");
    if (roots.length > 1) {
      issues.push({
        id: uid(), category: "technical", severity: "high",
        title: "Multiple React roots detected",
        description: "Multiple React root elements found which may cause rendering conflicts.",
        suggestedFix: "Ensure only one React root exists in the DOM.",
        autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
      });
    }

    // Check console error count
    const networkErrors = events.filter(e => e.source === "network" && !e.resolved);
    if (networkErrors.length > 3) {
      issues.push({
        id: uid(), category: "technical", severity: "high",
        title: `${networkErrors.length} API/network failure(s)`,
        description: `Multiple network errors detected: ${networkErrors.slice(0, 3).map(e => e.message).join("; ")}`,
        suggestedFix: "Check API endpoints, authentication, and network connectivity.",
        autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
      });
    }
  }

  return issues;
}
