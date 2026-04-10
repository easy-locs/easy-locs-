import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class PropertyNormalizer extends BaseEngine {
  constructor() {
    super({
      id: "data-property-normalizer",
      name: "Property Normalizer",
      category: "data",
      intervalMs: 180_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const listings = document.querySelectorAll("[data-property-id]");
    const ids = new Set<string>();
    listings.forEach(el => {
      const id = el.getAttribute("data-property-id") || "";
      if (ids.has(id)) {
        findings.push(`Duplicate property listing: ${id}`);
      }
      ids.add(id);

      const price = parseFloat(el.getAttribute("data-property-price") || "0");
      if (price <= 0) {
        findings.push(`Property ${id.substring(0, 8)} has zero/negative price`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
