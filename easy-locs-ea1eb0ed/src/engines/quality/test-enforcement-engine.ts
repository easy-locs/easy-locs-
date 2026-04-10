import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface TestFinding {
  type: "critical_flow_untested" | "responsive_issue" | "i18n_gap" | "regression_risk";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

const CRITICAL_FLOWS = [
  { name: "Login/Signup", selector: "[data-flow='auth']", route: "/login" },
  { name: "Checkout", selector: "[data-flow='checkout']", route: "/checkout" },
  { name: "Payment", selector: "[data-flow='payment']", route: "/pay" },
  { name: "Search/Radar", selector: "[data-flow='search']", route: "/explore" },
  { name: "Messaging", selector: "[data-flow='chat']", route: "/messages" },
  { name: "Wallet Transfer", selector: "[data-flow='transfer']", route: "/wallet/transfer" },
  { name: "Shop Onboarding", selector: "[data-flow='onboarding']", route: "/merchant/onboarding" },
];

export class TestEnforcementEngine extends BaseEngine {
  private findings: TestFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-test-enforcement",
      name: "Test Enforcement Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: TestFinding[] = [];

    const viewport = window.innerWidth;
    if (viewport < 768) {
      const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      if (horizontalOverflow) {
        findings.push({
          type: "responsive_issue",
          severity: "high",
          detail: `Page has horizontal overflow on mobile viewport (${viewport}px)`,
          recommendation: "Fix responsive layout — no horizontal scroll on mobile",
        });
      }

      const tinyTapTargets = document.querySelectorAll("button, a, [role='button']");
      let smallTargets = 0;
      tinyTapTargets.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
          smallTargets++;
        }
      });

      if (smallTargets > 10) {
        findings.push({
          type: "responsive_issue",
          severity: "medium",
          detail: `${smallTargets} tap targets smaller than 44px — difficult to tap on mobile`,
          recommendation: "Increase tap target size to minimum 44x44px",
        });
      }
    }

    const missingTranslations = document.querySelectorAll("[data-i18n-key][data-i18n-fallback]");
    if (missingTranslations.length > 5) {
      findings.push({
        type: "i18n_gap",
        severity: "medium",
        detail: `${missingTranslations.length} elements using i18n fallback text`,
        recommendation: "Add proper translations for all supported languages",
      });
    }

    const hardcodedStrings = document.querySelectorAll("[data-hardcoded-text]");
    if (hardcodedStrings.length > 0) {
      findings.push({
        type: "i18n_gap",
        severity: "medium",
        detail: `${hardcodedStrings.length} hardcoded text strings not wrapped in i18n`,
        recommendation: "Wrap all user-visible text in translation functions",
      });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8 - findings.filter(f => f.severity === "low").length * 3);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
