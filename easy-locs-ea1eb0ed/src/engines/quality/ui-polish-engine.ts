import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface UIFinding {
  type: "hardcoded_color" | "truncation_issue" | "spacing_inconsistency" | "missing_alt" | "tiny_text" | "overflow_detected" | "missing_i18n_key";
  severity: "low" | "medium" | "high";
  element: string;
  detail: string;
  recommendation: string;
}

const BRAND_NAVY = "hsl(220";
const BRAND_GOLD = "hsl(38";

export class UIPolishEngine extends BaseEngine {
  private findings: UIFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-ui-polish",
      name: "UI Polish Engine",
      category: "quality",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: UIFinding[] = [];

    const allElements = document.querySelectorAll("*");
    let overflowCount = 0;
    let tinyTextCount = 0;
    let missingAltCount = 0;

    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const computed = window.getComputedStyle(htmlEl);

      if (htmlEl.scrollWidth > htmlEl.clientWidth + 2 && computed.overflow !== "hidden" && computed.overflowX !== "hidden" && computed.overflowX !== "scroll" && computed.overflowX !== "auto") {
        const tagInfo = `${htmlEl.tagName.toLowerCase()}${htmlEl.className ? '.' + htmlEl.className.split(' ')[0] : ''}`;
        if (htmlEl.clientWidth > 50) {
          overflowCount++;
          if (overflowCount <= 10) {
            findings.push({
              type: "overflow_detected",
              severity: "medium",
              element: tagInfo,
              detail: `Horizontal overflow on <${tagInfo}> (scroll: ${htmlEl.scrollWidth}px, client: ${htmlEl.clientWidth}px)`,
              recommendation: "Add overflow-hidden, text-ellipsis, or responsive width",
            });
          }
        }
      }

      const fontSize = parseFloat(computed.fontSize);
      if (fontSize > 0 && fontSize < 10 && htmlEl.textContent && htmlEl.textContent.trim().length > 0) {
        tinyTextCount++;
      }
    });

    if (tinyTextCount > 5) {
      findings.push({
        type: "tiny_text",
        severity: "medium",
        element: "multiple",
        detail: `${tinyTextCount} elements with text smaller than 10px`,
        recommendation: "Minimum text size should be 10px per design system",
      });
    }

    const images = document.querySelectorAll("img");
    images.forEach(img => {
      if (!img.alt || img.alt.trim() === "") {
        missingAltCount++;
      }
    });

    if (missingAltCount > 0) {
      findings.push({
        type: "missing_alt",
        severity: "low",
        element: "img",
        detail: `${missingAltCount} images without alt text`,
        recommendation: "Add descriptive alt text for accessibility",
      });
    }

    const textNodes = document.querySelectorAll("[data-i18n-missing]");
    if (textNodes.length > 0) {
      findings.push({
        type: "missing_i18n_key",
        severity: "medium",
        element: "i18n",
        detail: `${textNodes.length} elements with missing i18n translations`,
        recommendation: "Add translation keys for all user-visible text",
      });
    }

    const cards = document.querySelectorAll("[data-card], .card, [class*='Card']");
    const cardHeights = new Map<string, number[]>();
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.height > 0) {
        const key = card.getAttribute("data-card-type") || "default";
        if (!cardHeights.has(key)) cardHeights.set(key, []);
        cardHeights.get(key)!.push(Math.round(rect.height));
      }
    });

    for (const [type, heights] of cardHeights) {
      if (heights.length >= 3) {
        const avg = heights.reduce((s, h) => s + h, 0) / heights.length;
        const variance = heights.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / heights.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > avg * 0.3 && avg > 50) {
          findings.push({
            type: "spacing_inconsistency",
            severity: "medium",
            element: `cards[${type}]`,
            detail: `Card type "${type}" has inconsistent heights (avg: ${Math.round(avg)}px, stddev: ${Math.round(stdDev)}px)`,
            recommendation: "Standardize card heights or use consistent padding/content structure",
          });
        }
      }
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
