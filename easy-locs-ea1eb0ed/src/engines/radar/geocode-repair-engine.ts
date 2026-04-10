import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class GeocodeRepairEngine extends BaseEngine {
  constructor() {
    super({
      id: "radar-geocode-repair",
      name: "Geocode Repair Engine",
      category: "radar",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const addressEls = document.querySelectorAll("[data-address]");
    let emptyAddresses = 0;
    let noCoords = 0;
    addressEls.forEach(el => {
      const addr = el.getAttribute("data-address") || "";
      if (!addr.trim()) emptyAddresses++;
      const lat = el.getAttribute("data-lat");
      const lng = el.getAttribute("data-lng");
      if (!lat || !lng) noCoords++;
    });

    if (emptyAddresses > 0) {
      findings.push(`${emptyAddresses} empty address fields displayed`);
    }
    if (noCoords > 3) {
      findings.push(`${noCoords} addresses without geocoordinates`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
