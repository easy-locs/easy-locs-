import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ShadowModeEngine extends BaseEngine {
  private shadowFeatures: Map<string, { enabled: boolean; activeSince: number; impressions: number }> = new Map();

  constructor() {
    super({
      id: "release-shadow-mode",
      name: "Shadow Mode Engine",
      category: "release",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const featureEls = document.querySelectorAll("[data-feature-flag]");
    featureEls.forEach(el => {
      const flag = el.getAttribute("data-feature-flag") || "";
      const existing = this.shadowFeatures.get(flag);
      if (existing) {
        existing.impressions++;
      } else {
        this.shadowFeatures.set(flag, { enabled: true, activeSince: Date.now(), impressions: 1 });
      }
    });

    for (const [flag, data] of this.shadowFeatures) {
      const age = Date.now() - data.activeSince;
      if (age > 7 * 24 * 3600_000 && data.impressions < 10) {
        findings.push(`Stale feature flag "${flag}": ${age / 3600_000}h old, only ${data.impressions} impressions`);
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
