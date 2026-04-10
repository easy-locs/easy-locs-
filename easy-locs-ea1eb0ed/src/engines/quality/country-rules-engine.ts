import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

interface CountryRuleFinding {
  type: "missing_country_config" | "hardcoded_currency" | "hardcoded_language" | "missing_format_adapter" | "single_country_assumption";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

const MULTI_COUNTRY_INDICATORS = {
  currencySymbols: ["$", "€", "£", "¥", "د.إ", "₹", "₦", "R"],
  dateFormats: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
  phoneFormats: ["+1", "+44", "+971", "+33", "+49", "+91"],
};

export class CountryRulesEngine extends BaseEngine {
  private findings: CountryRuleFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-country-rules",
      name: "Country Rules Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: CountryRuleFinding[] = [];

    const hardcodedCurrencyEls = document.querySelectorAll("[data-currency]");
    const currencies = new Set<string>();
    hardcodedCurrencyEls.forEach(el => {
      const c = el.getAttribute("data-currency");
      if (c) currencies.add(c);
    });

    if (currencies.size === 1) {
      findings.push({
        type: "single_country_assumption",
        severity: "medium",
        detail: `Only one currency (${[...currencies][0]}) detected — app claims 120+ currencies`,
        recommendation: "Ensure currency formatting adapts to user's locale/country",
      });
    }

    const allText = document.body?.innerText || "";
    for (const symbol of MULTI_COUNTRY_INDICATORS.currencySymbols) {
      if (allText.includes(symbol)) {
        const regex = new RegExp(`\\${symbol}\\d`, "g");
        const matches = allText.match(regex);
        if (matches && matches.length > 0) {
          const hasFormatter = document.querySelector(`[data-formatted-currency]`);
          if (!hasFormatter) {
            findings.push({
              type: "hardcoded_currency",
              severity: "low",
              detail: `Currency symbol "${symbol}" appears hardcoded (${matches.length} instances)`,
              recommendation: "Use Intl.NumberFormat or currency formatter for locale-aware display",
            });
            break;
          }
        }
      }
    }

    const langAttr = document.documentElement.getAttribute("lang");
    if (!langAttr) {
      findings.push({
        type: "missing_format_adapter",
        severity: "medium",
        detail: "HTML element has no lang attribute",
        recommendation: "Set html[lang] dynamically based on user's language preference",
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
