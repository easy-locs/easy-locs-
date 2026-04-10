import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class CurrencyPolicyEngine extends BaseEngine {
  constructor() {
    super({
      id: "data-currency-policy",
      name: "Currency Policy Engine",
      category: "data",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const currencyEls = document.querySelectorAll("[data-currency]");
    const currencies = new Set<string>();
    currencyEls.forEach(el => {
      const c = (el.getAttribute("data-currency") || "").toUpperCase();
      if (c) currencies.add(c);
    });

    if (currencies.size > 2) {
      findings.push(`Multiple currencies displayed: ${[...currencies].join(", ")}`);
    }

    const priceTexts = document.querySelectorAll("[data-price-formatted]");
    priceTexts.forEach(el => {
      const text = el.textContent || "";
      const symbolMatch = text.match(/[€$£¥₹₽₩₺฿]/g);
      if (symbolMatch && new Set(symbolMatch).size > 1) {
        findings.push(`Mixed currency symbols in single element: ${text.substring(0, 40)}`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
