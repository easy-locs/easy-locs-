import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface DeadCodeFinding {
  type: "unused_component" | "dead_route" | "orphan_handler" | "dead_feature_flag" | "unused_store";
  severity: "low" | "medium" | "high";
  target: string;
  detail: string;
  recommendation: string;
}

const KNOWN_DEAD_PATTERNS = [
  { pattern: "data-deprecated", type: "unused_component" as const },
  { pattern: "data-legacy", type: "unused_component" as const },
];

export class DeadCodeEngine extends BaseEngine {
  private findings: DeadCodeFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-dead-code",
      name: "Dead Code Detection Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: DeadCodeFinding[] = [];

    for (const { pattern, type } of KNOWN_DEAD_PATTERNS) {
      const els = document.querySelectorAll(`[${pattern}]`);
      if (els.length > 0) {
        findings.push({
          type,
          severity: "medium",
          target: pattern,
          detail: `${els.length} elements marked as ${pattern}`,
          recommendation: `Remove deprecated/legacy elements marked with ${pattern}`,
        });
      }
    }

    const scripts = document.querySelectorAll("script[src]");
    const moduleCount = scripts.length;
    if (moduleCount > 50) {
      findings.push({
        type: "unused_component",
        severity: "low",
        target: "scripts",
        detail: `${moduleCount} script tags loaded — possible oversized bundle`,
        recommendation: "Review code splitting and lazy loading strategy",
      });
    }

    const allHandlers = document.querySelectorAll("[onclick], [onchange], [onsubmit]");
    if (allHandlers.length > 0) {
      findings.push({
        type: "orphan_handler",
        severity: "medium",
        target: "inline-handlers",
        detail: `${allHandlers.length} inline event handlers found (non-React pattern)`,
        recommendation: "Replace inline handlers with React event handlers",
      });
    }

    const hiddenElements = document.querySelectorAll("[hidden], [style*='display: none'], [style*='display:none']");
    let permanentlyHidden = 0;
    hiddenElements.forEach(el => {
      if (!el.closest("[data-overlay]") && !el.closest("[data-modal]") && !el.closest("[data-drawer]") && !el.closest("[role='dialog']")) {
        permanentlyHidden++;
      }
    });

    if (permanentlyHidden > 20) {
      findings.push({
        type: "unused_component",
        severity: "low",
        target: "hidden-elements",
        detail: `${permanentlyHidden} permanently hidden elements in DOM (not modals/drawers)`,
        recommendation: "Consider conditional rendering instead of hiding with CSS",
      });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
