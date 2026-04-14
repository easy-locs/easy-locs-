import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";

export interface HookHealthIssue {
  type: "memory_leak" | "stale_closure" | "excessive_rerenders" | "unclean_effect" | "orphan_subscription" | "context_missing";
  hookName?: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface HookHealthReport {
  timestamp: string;
  scanCount: number;
  issues: HookHealthIssue[];
  activeObservers: number;
  activeTimers: number;
  activeListeners: number;
  memoryMB: number;
  score: number;
  status: "healthy" | "warnings" | "degraded";
}

let lastReport: HookHealthReport | null = null;
let scanCount = 0;

const originalSetInterval = window.setInterval;
const originalSetTimeout = window.setTimeout;
const originalClearInterval = window.clearInterval;
const originalClearTimeout = window.clearTimeout;

let activeTimerCount = 0;
let activeIntervalCount = 0;
let timerTrackingInstalled = false;

function installTimerTracking() {
  if (timerTrackingInstalled) return;
  timerTrackingInstalled = true;

  window.setInterval = ((...args: Parameters<typeof originalSetInterval>) => {
    activeIntervalCount++;
    const id = originalSetInterval(...args);
    return id;
  }) as typeof window.setInterval;

  window.clearInterval = ((id: number) => {
    activeIntervalCount = Math.max(0, activeIntervalCount - 1);
    return originalClearInterval(id);
  }) as typeof window.clearInterval;
}

function detectMemoryPressure(): HookHealthIssue[] {
  const issues: HookHealthIssue[] = [];
  try {
    const perf = (performance as any);
    if (perf.memory) {
      const usedMB = perf.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = perf.memory.jsHeapSizeLimit / 1024 / 1024;
      const ratio = usedMB / limitMB;
      if (ratio > 0.85) {
        issues.push({
          type: "memory_leak",
          detail: `Memory usage at ${Math.round(ratio * 100)}% (${Math.round(usedMB)}MB / ${Math.round(limitMB)}MB) — possible leak`,
          severity: ratio > 0.95 ? "critical" : "high",
        });
      }
    }
  } catch {}
  return issues;
}

function detectExcessiveObservers(): HookHealthIssue[] {
  const issues: HookHealthIssue[] = [];
  try {
    if (activeIntervalCount > 30) {
      issues.push({
        type: "orphan_subscription",
        detail: `${activeIntervalCount} active intervals — possible orphan subscriptions`,
        severity: "high",
      });
    }
  } catch {}
  return issues;
}

function detectDomNodeExplosion(): HookHealthIssue[] {
  const issues: HookHealthIssue[] = [];
  try {
    const nodeCount = document.querySelectorAll("*").length;
    if (nodeCount > 5000) {
      issues.push({
        type: "excessive_rerenders",
        detail: `${nodeCount} DOM nodes — possible render explosion or missing virtualization`,
        severity: nodeCount > 10000 ? "critical" : "high",
      });
    }
  } catch {}
  return issues;
}

function detectEventListenerLeaks(): HookHealthIssue[] {
  const issues: HookHealthIssue[] = [];
  try {
    const eventTargets = document.querySelectorAll("*");
    let totalListeners = 0;
    eventTargets.forEach(el => {
      const events = (el as any).__eventListeners;
      if (events) {
        for (const key in events) {
          totalListeners += events[key]?.length || 0;
        }
      }
    });
  } catch {}
  return issues;
}

export function runHookHealthScan(): HookHealthReport {
  installTimerTracking();
  scanCount++;

  const issues: HookHealthIssue[] = [
    ...detectMemoryPressure(),
    ...detectExcessiveObservers(),
    ...detectDomNodeExplosion(),
    ...detectEventListenerLeaks(),
  ];

  let memoryMB = 0;
  try {
    const perf = (performance as any);
    if (perf.memory) memoryMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
  } catch {}

  let activeObservers = 0;
  try {
    activeObservers = document.querySelectorAll("[data-observer]").length;
  } catch {}

  const criticals = issues.filter(i => i.severity === "critical").length;
  const highs = issues.filter(i => i.severity === "high").length;
  const score = Math.max(0, 100 - criticals * 30 - highs * 15 - (issues.length - criticals - highs) * 5);

  let status: HookHealthReport["status"] = "healthy";
  if (criticals > 0) status = "degraded";
  else if (issues.length > 0) status = "warnings";

  const report: HookHealthReport = {
    timestamp: new Date().toISOString(),
    scanCount,
    issues,
    activeObservers,
    activeTimers: activeTimerCount,
    activeListeners: activeIntervalCount,
    memoryMB,
    score,
    status,
  };

  lastReport = report;

  if (criticals > 0) {
    for (const issue of issues.filter(i => i.severity === "critical")) {
      reportAnomaly("performance_issue", "hook-health-monitor", issue.detail, "critical");
    }
  }

  reportHealth("hook-health", status === "degraded" ? "degraded" : "ok",
    undefined, `${memoryMB}MB heap, ${issues.length} issues, score ${score}/100`);

  return report;
}

export function getLastHookHealthReport(): HookHealthReport | null {
  return lastReport;
}
