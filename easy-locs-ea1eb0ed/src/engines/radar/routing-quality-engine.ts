import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class RoutingQualityEngine extends BaseEngine {
  constructor() {
    super({
      id: "radar-routing-quality",
      name: "Routing Quality Engine",
      category: "radar",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const routeEls = document.querySelectorAll("[data-route-distance]");
    routeEls.forEach(el => {
      const distance = parseFloat(el.getAttribute("data-route-distance") || "0");
      const duration = parseFloat(el.getAttribute("data-route-duration") || "0");

      if (distance > 0 && duration > 0) {
        const speedKmh = (distance / 1000) / (duration / 3600);
        if (speedKmh > 200) {
          findings.push(`Unrealistic route: ${Math.round(speedKmh)}km/h average speed`);
        }
        if (speedKmh < 1 && distance > 1000) {
          findings.push(`Suspiciously slow route: ${Math.round(speedKmh)}km/h for ${Math.round(distance)}m`);
        }
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
