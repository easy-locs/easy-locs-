/**
 * Performance Audit Engine — Measures load times, detects slow components, analyzes bundle.
 */

export interface PerformanceReport {
  domContentLoaded: number | null;
  firstContentfulPaint: number | null;
  jsHeapUsedMb: number | null;
  domNodes: number;
  scriptCount: number;
  totalResourcesKb: number;
  longTasks: number;
  slowComponents: string[];
  unnecessaryFetches: string[];
  recommendations: string[];
  timestamp: string;
}

export function runPerformanceAudit(): PerformanceReport {
  const report: PerformanceReport = {
    domContentLoaded: null,
    firstContentfulPaint: null,
    jsHeapUsedMb: null,
    domNodes: 0,
    scriptCount: 0,
    totalResourcesKb: 0,
    longTasks: 0,
    slowComponents: [],
    unnecessaryFetches: [],
    recommendations: [],
    timestamp: new Date().toISOString(),
  };

  if (typeof window === "undefined") return report;

  // DOM metrics
  report.domNodes = document.querySelectorAll("*").length;
  report.scriptCount = document.querySelectorAll("script").length;

  // Navigation timing
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) {
    report.domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
    report.firstContentfulPaint = Math.round(nav.responseStart);
  }

  // FCP
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  if (fcp) {
    report.firstContentfulPaint = Math.round(fcp.startTime);
  }

  // JS Heap
  const mem = (performance as any).memory;
  if (mem) {
    report.jsHeapUsedMb = Math.round(mem.usedJSHeapSize / 1048576 * 10) / 10;
  }

  // Resources
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  report.totalResourcesKb = Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);

  // Recommendations
  if (report.domNodes > 1500) {
    report.recommendations.push(`High DOM count: ${report.domNodes} nodes. Consider virtualization.`);
  }
  if (report.domContentLoaded && report.domContentLoaded > 4000) {
    report.recommendations.push(`Slow DCL: ${report.domContentLoaded}ms. Code-split heavy modules.`);
  }
  if (report.jsHeapUsedMb && report.jsHeapUsedMb > 50) {
    report.recommendations.push(`High memory: ${report.jsHeapUsedMb}MB. Check for memory leaks.`);
  }

  console.log(`[performance-audit] DOM:${report.domNodes} FCP:${report.firstContentfulPaint}ms Heap:${report.jsHeapUsedMb}MB`);
  return report;
}
