import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ServiceNormalizer extends BaseEngine {
  constructor() {
    super({
      id: "data-service-normalizer",
      name: "Service Normalizer",
      category: "data",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const serviceCards = document.querySelectorAll("[data-service-type]");
    const types = new Map<string, number>();
    serviceCards.forEach(el => {
      const type = el.getAttribute("data-service-type") || "";
      types.set(type, (types.get(type) || 0) + 1);
    });

    for (const [type, count] of types) {
      if (!type) {
        findings.push(`${count} services without type classification`);
      }
    }

    const priceEls = document.querySelectorAll("[data-service-price]");
    priceEls.forEach(el => {
      const price = parseFloat(el.getAttribute("data-service-price") || "");
      if (isNaN(price) || price < 0) {
        findings.push(`Invalid service price: ${el.getAttribute("data-service-price")}`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
