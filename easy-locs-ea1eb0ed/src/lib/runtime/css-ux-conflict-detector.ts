import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";

export interface CssUxIssue {
  type: "overlay_conflict" | "z_index_war" | "scroll_lock" | "gesture_conflict" | "viewport_overflow" | "opacity_trap" | "animation_jank" | "touch_dead_zone" | "font_inconsistency" | "color_contrast_fail";
  element?: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  autoFixable: boolean;
}

export interface CssUxReport {
  timestamp: string;
  scanCount: number;
  issues: CssUxIssue[];
  score: number;
  status: "clean" | "warnings" | "degraded" | "critical";
}

let lastReport: CssUxReport | null = null;
let scanCount = 0;

function detectOverlayConflicts(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    const overlays = document.querySelectorAll("[data-overlay], [role='dialog'], [role='alertdialog'], .fixed, .sticky");
    const visibleOverlays: Element[] = [];
    overlays.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity) > 0) {
        visibleOverlays.push(el);
      }
    });
    if (visibleOverlays.length > 2) {
      issues.push({
        type: "overlay_conflict",
        detail: `${visibleOverlays.length} overlays visible simultaneously — possible stacking conflict`,
        severity: "high",
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function detectZIndexWars(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    const zElements: Array<{ el: Element; z: number }> = [];
    document.querySelectorAll("*").forEach(el => {
      const z = parseInt(window.getComputedStyle(el).zIndex);
      if (!isNaN(z) && z > 50) zElements.push({ el, z });
    });
    const extremeZ = zElements.filter(e => e.z > 9999);
    if (extremeZ.length > 3) {
      issues.push({
        type: "z_index_war",
        detail: `${extremeZ.length} elements with z-index > 9999 — z-index war detected`,
        severity: "medium",
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function detectViewportOverflow(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    const docWidth = document.documentElement.clientWidth;
    const bodyWidth = document.body.scrollWidth;
    if (bodyWidth > docWidth + 5) {
      issues.push({
        type: "viewport_overflow",
        detail: `Horizontal overflow detected: body ${bodyWidth}px > viewport ${docWidth}px`,
        severity: "high",
        autoFixable: true,
      });
    }
  } catch {}
  return issues;
}

function detectScrollLock(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    const body = document.body;
    const html = document.documentElement;
    const bodyStyle = window.getComputedStyle(body);
    const htmlStyle = window.getComputedStyle(html);
    if (bodyStyle.overflow === "hidden" && htmlStyle.overflow === "hidden") {
      const hasDialog = document.querySelector("[role='dialog']:not([aria-hidden='true'])");
      if (!hasDialog) {
        issues.push({
          type: "scroll_lock",
          detail: "Body and HTML overflow both hidden with no active dialog — user trapped",
          severity: "critical",
          autoFixable: true,
        });
      }
    }
  } catch {}
  return issues;
}

function detectAnimationJank(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    let animatingElements = 0;
    document.querySelectorAll("*").forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.animationName !== "none" || style.transition !== "all 0s ease 0s") {
        animatingElements++;
      }
    });
    if (animatingElements > 50) {
      issues.push({
        type: "animation_jank",
        detail: `${animatingElements} elements with active animations — performance risk`,
        severity: "medium",
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function detectFontInconsistency(): CssUxIssue[] {
  const issues: CssUxIssue[] = [];
  try {
    const fontFamilies = new Set<string>();
    document.querySelectorAll("p, h1, h2, h3, h4, span, a, button, label, input").forEach(el => {
      const font = window.getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/"/g, "");
      if (font) fontFamilies.add(font);
    });
    if (fontFamilies.size > 4) {
      issues.push({
        type: "font_inconsistency",
        detail: `${fontFamilies.size} different font families used — design inconsistency (${[...fontFamilies].slice(0, 5).join(", ")})`,
        severity: "low",
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function autoFixIssues(issues: CssUxIssue[]): number {
  let fixed = 0;
  for (const issue of issues) {
    if (!issue.autoFixable) continue;
    try {
      if (issue.type === "viewport_overflow") {
        document.body.style.overflowX = "hidden";
        fixed++;
      }
      if (issue.type === "scroll_lock") {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        fixed++;
      }
    } catch {}
  }
  return fixed;
}

export function runCssUxScan(): CssUxReport {
  scanCount++;
  const issues: CssUxIssue[] = [
    ...detectOverlayConflicts(),
    ...detectZIndexWars(),
    ...detectViewportOverflow(),
    ...detectScrollLock(),
    ...detectAnimationJank(),
    ...detectFontInconsistency(),
  ];

  const fixedCount = autoFixIssues(issues);

  const criticals = issues.filter(i => i.severity === "critical").length;
  const highs = issues.filter(i => i.severity === "high").length;
  const score = Math.max(0, 100 - criticals * 25 - highs * 15 - (issues.length - criticals - highs) * 5);

  let status: CssUxReport["status"] = "clean";
  if (criticals > 0) status = "critical";
  else if (highs > 0) status = "degraded";
  else if (issues.length > 0) status = "warnings";

  const report: CssUxReport = {
    timestamp: new Date().toISOString(),
    scanCount,
    issues,
    score,
    status,
  };

  lastReport = report;

  if (issues.length > 0) {
    for (const issue of issues.filter(i => i.severity === "critical" || i.severity === "high")) {
      reportAnomaly("architecture_violation", "css-ux-detector",
        `${issue.type}: ${issue.detail}`, issue.severity === "critical" ? "critical" : "high");
    }
  }

  reportHealth("css-ux-quality", status === "critical" ? "degraded" : "ok",
    undefined, issues.length > 0 ? `${issues.length} issues, ${fixedCount} auto-fixed, score ${score}/100` : undefined);

  return report;
}

export function getLastCssUxReport(): CssUxReport | null {
  return lastReport;
}

export function getCssUxScanCount(): number {
  return scanCount;
}
