/**
 * DINO V8 — Global Performance Optimizer
 * Detects slow pages, optimizes rendering, reduces unnecessary load.
 */

export interface PagePerformanceData {
  route: string;
  avgLoadMs: number;
  avgRenderMs: number;
  cls: number;                // Cumulative Layout Shift 0-1
  fcp: number;                // First Contentful Paint ms
  lcp: number;                // Largest Contentful Paint ms
  interactionLatencyMs: number;
  componentCount: number;
  imageCount: number;
  lazyLoadedImages: number;
}

export interface PerformanceIssue {
  route: string;
  type: "slow_load" | "high_cls" | "slow_render" | "too_many_components" | "unoptimized_images" | "high_latency";
  severity: "critical" | "major" | "minor";
  description: string;
  recommendation: string;
  metric: number;
  threshold: number;
}

const THRESHOLDS = {
  loadMs: 2000,
  renderMs: 500,
  cls: 0.1,
  fcp: 1800,
  lcp: 2500,
  latencyMs: 200,
  maxComponents: 100,
  minLazyRatio: 0.5,
};

export function analyzePagePerformance(pages: PagePerformanceData[]): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];

  for (const page of pages) {
    if (page.avgLoadMs > THRESHOLDS.loadMs) {
      issues.push({
        route: page.route, type: "slow_load",
        severity: page.avgLoadMs > 5000 ? "critical" : "major",
        description: `Page load ${page.avgLoadMs}ms exceeds ${THRESHOLDS.loadMs}ms threshold`,
        recommendation: "Reduce bundle size, add code splitting, optimize API calls",
        metric: page.avgLoadMs, threshold: THRESHOLDS.loadMs,
      });
    }

    if (page.cls > THRESHOLDS.cls) {
      issues.push({
        route: page.route, type: "high_cls",
        severity: page.cls > 0.25 ? "critical" : "major",
        description: `CLS ${page.cls.toFixed(3)} exceeds ${THRESHOLDS.cls} threshold`,
        recommendation: "Add dimension placeholders, use skeleton loaders, set image sizes",
        metric: page.cls, threshold: THRESHOLDS.cls,
      });
    }

    if (page.lcp > THRESHOLDS.lcp) {
      issues.push({
        route: page.route, type: "slow_render",
        severity: page.lcp > 4000 ? "critical" : "major",
        description: `LCP ${page.lcp}ms exceeds ${THRESHOLDS.lcp}ms threshold`,
        recommendation: "Optimize largest element, preload critical resources",
        metric: page.lcp, threshold: THRESHOLDS.lcp,
      });
    }

    if (page.componentCount > THRESHOLDS.maxComponents) {
      issues.push({
        route: page.route, type: "too_many_components",
        severity: "minor",
        description: `${page.componentCount} components on page — may cause re-render issues`,
        recommendation: "Virtualize long lists, memoize expensive components",
        metric: page.componentCount, threshold: THRESHOLDS.maxComponents,
      });
    }

    if (page.imageCount > 0) {
      const lazyRatio = page.lazyLoadedImages / page.imageCount;
      if (lazyRatio < THRESHOLDS.minLazyRatio) {
        issues.push({
          route: page.route, type: "unoptimized_images",
          severity: "minor",
          description: `Only ${Math.round(lazyRatio * 100)}% of images are lazy-loaded`,
          recommendation: "Enable lazy loading for below-fold images",
          metric: lazyRatio, threshold: THRESHOLDS.minLazyRatio,
        });
      }
    }

    if (page.interactionLatencyMs > THRESHOLDS.latencyMs) {
      issues.push({
        route: page.route, type: "high_latency",
        severity: page.interactionLatencyMs > 500 ? "critical" : "major",
        description: `Interaction latency ${page.interactionLatencyMs}ms — UI feels sluggish`,
        recommendation: "Reduce event handler complexity, debounce expensive operations",
        metric: page.interactionLatencyMs, threshold: THRESHOLDS.latencyMs,
      });
    }
  }

  return issues.sort((a, b) => {
    const s = { critical: 0, major: 1, minor: 2 };
    return s[a.severity] - s[b.severity];
  });
}
