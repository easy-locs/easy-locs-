import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface DeadFlowFinding {
  type: "dead_button" | "dead_cta" | "broken_link" | "empty_action" | "orphan_form";
  severity: "low" | "medium" | "high";
  element: string;
  detail: string;
  recommendation: string;
}

export class DeadFlowEngine extends BaseEngine {
  private findings: DeadFlowFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-dead-flow",
      name: "Dead Flow Detection Engine",
      category: "quality",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: DeadFlowFinding[] = [];

    const buttons = document.querySelectorAll("button");
    let emptyButtons = 0;
    buttons.forEach(btn => {
      const text = btn.textContent?.trim() || "";
      const hasIcon = btn.querySelector("svg, img, [data-icon]");
      if (!text && !hasIcon && !btn.getAttribute("aria-label")) {
        emptyButtons++;
      }
    });

    if (emptyButtons > 5) {
      findings.push({
        type: "dead_button",
        severity: "medium",
        element: "button",
        detail: `${emptyButtons} buttons with no text, icon, or aria-label`,
        recommendation: "Add accessible labels to all interactive buttons",
      });
    }

    const links = document.querySelectorAll("a[href]");
    let deadLinks = 0;
    links.forEach(a => {
      const href = a.getAttribute("href") || "";
      if (href === "#" || href === "javascript:void(0)" || href === "") {
        deadLinks++;
      }
    });

    if (deadLinks > 0) {
      findings.push({
        type: "broken_link",
        severity: "high",
        element: "a[href='#']",
        detail: `${deadLinks} links with dead hrefs (#, javascript:void(0), empty)`,
        recommendation: "Replace dead hrefs with proper routes or button elements",
      });
    }

    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
      const action = form.getAttribute("action");
      const submitBtn = form.querySelector("[type='submit'], button:not([type='button'])");
      if (!submitBtn && !form.querySelector("[data-submit]")) {
        findings.push({
          type: "orphan_form",
          severity: "medium",
          element: `form${action ? `[action='${action}']` : ''}`,
          detail: "Form without submit button — flow cannot complete",
          recommendation: "Add a submit button or remove the unused form",
        });
      }
    });

    const ctaButtons = document.querySelectorAll("[data-cta], .cta, [class*='Cta']");
    ctaButtons.forEach(cta => {
      const htmlCta = cta as HTMLElement;
      if (htmlCta.offsetWidth === 0 || htmlCta.offsetHeight === 0) {
        findings.push({
          type: "dead_cta",
          severity: "high",
          element: htmlCta.tagName.toLowerCase(),
          detail: `CTA element is invisible (0x0 dimensions)`,
          recommendation: "Fix CTA visibility — it may be hidden by CSS or container",
        });
      }
    });

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
