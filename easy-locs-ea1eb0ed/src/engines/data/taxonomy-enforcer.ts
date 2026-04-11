import { BaseEngine, type EngineTickResult } from "../core/base-engine";

const CANONICAL_VERTICALS = new Set([
  "food", "grocery", "services", "beauty", "health", "fitness",
  "hotel", "property", "travel", "coffee", "shops",
]);

export class TaxonomyEnforcer extends BaseEngine {
  static readonly RUNTIME_CLASS = "browser-monitor";
  static readonly BACKEND_WORKER = "taxonomy-enforcer";

  constructor() {
    super({
      id: "data-taxonomy-enforcer",
      name: "Taxonomy Enforcer (Monitor)",
      category: "data",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const verticalEls = document.querySelectorAll("[data-vertical]");
    const verticals = new Map<string, number>();
    verticalEls.forEach(el => {
      const v = el.getAttribute("data-vertical") || "";
      verticals.set(v, (verticals.get(v) || 0) + 1);
    });

    for (const [vertical, count] of verticals) {
      if (!CANONICAL_VERTICALS.has(vertical) && vertical) {
        findings.push(`Non-canonical vertical: "${vertical}" (${count} instances)`);
      }
    }

    const categoryEls = document.querySelectorAll("[data-category]");
    categoryEls.forEach(el => {
      const cat = el.getAttribute("data-category") || "";
      const vertical = el.closest("[data-vertical]")?.getAttribute("data-vertical") || "";
      if (cat && vertical && cat.toLowerCase().includes("food") && vertical !== "food") {
        findings.push(`Category mismatch: food category in ${vertical} vertical`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
