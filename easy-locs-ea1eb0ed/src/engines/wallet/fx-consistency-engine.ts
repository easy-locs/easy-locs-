import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class FXConsistencyEngine extends BaseEngine {
  private lastRates: Map<string, number> = new Map();

  constructor() {
    super({
      id: "wallet-fx-consistency",
      name: "FX Consistency Engine",
      category: "wallet",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const currencyEls = document.querySelectorAll("[data-currency]");
    const currencies = new Set<string>();
    currencyEls.forEach(el => {
      const c = el.getAttribute("data-currency");
      if (c) currencies.add(c);
    });

    if (currencies.size > 3) {
      findings.push(`${currencies.size} currencies displayed simultaneously — verify consistency`);
    }

    const priceEls = document.querySelectorAll("[data-price]");
    let invalidPrices = 0;
    priceEls.forEach(el => {
      const price = parseFloat(el.getAttribute("data-price") || "");
      if (isNaN(price) || price < 0) invalidPrices++;
    });
    if (invalidPrices > 0) {
      findings.push(`${invalidPrices} invalid price displays detected`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
