import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface ConversionStep {
  name: string;
  entered: number;
  completed: number;
}

export class ConversionEngine extends BaseEngine {
  private funnels: Map<string, ConversionStep[]> = new Map();

  constructor() {
    super({
      id: "biz-conversion",
      name: "Conversion Engine",
      category: "business",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const ctaButtons = document.querySelectorAll("[data-cta]");
    if (ctaButtons.length === 0 && window.location.pathname !== "/") {
      findings.push("No CTA buttons visible on current page");
    }

    const addToCartBtns = document.querySelectorAll("[data-action='add-to-cart'], [data-action='book'], [data-action='order']");
    let disabledCtas = 0;
    addToCartBtns.forEach(btn => {
      if ((btn as HTMLButtonElement).disabled) disabledCtas++;
    });
    if (disabledCtas > 0 && addToCartBtns.length > 0) {
      const ratio = disabledCtas / addToCartBtns.length;
      if (ratio > 0.5) {
        findings.push(`${Math.round(ratio * 100)}% of action buttons disabled — conversion blocker`);
      }
    }

    const errorMessages = document.querySelectorAll("[data-error], .text-destructive, [role='alert']");
    if (errorMessages.length > 3) {
      findings.push(`${errorMessages.length} error messages visible — user friction`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
