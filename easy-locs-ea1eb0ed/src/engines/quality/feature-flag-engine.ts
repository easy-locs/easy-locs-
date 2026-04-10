import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { isEngineEnabled } from "../core/engine-feature-flags";

interface FeatureFlagFinding {
  type: "stale_flag" | "missing_rollback" | "inconsistent_flag" | "flag_debt";
  severity: "low" | "medium" | "high";
  flag: string;
  detail: string;
  recommendation: string;
}

const KNOWN_FLAGS = [
  "payments_v2",
  "orbit_e2ee",
  "radar_clustering",
  "ai_suggestions",
  "property_portal",
  "dark_mode",
  "multi_language",
  "advanced_analytics",
  "delivery_tracking_v2",
  "booking_calendar_v2",
];

export class FeatureFlagEngine extends BaseEngine {
  private findings: FeatureFlagFinding[] = [];
  private score = 100;
  private activeFlags: string[] = [];
  private disabledFlags: string[] = [];

  constructor() {
    super({
      id: "quality-feature-flags",
      name: "Feature Flag Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: FeatureFlagFinding[] = [];
    const active: string[] = [];
    const disabled: string[] = [];

    for (const flag of KNOWN_FLAGS) {
      const enabled = isEngineEnabled(flag);
      if (enabled) {
        active.push(flag);
      } else {
        disabled.push(flag);
      }
    }

    const domFlags = document.querySelectorAll("[data-feature-flag]");
    const domFlagNames = new Set<string>();
    domFlags.forEach(el => {
      const name = el.getAttribute("data-feature-flag");
      if (name) domFlagNames.add(name);
    });

    for (const flag of domFlagNames) {
      if (!KNOWN_FLAGS.includes(flag)) {
        findings.push({
          type: "inconsistent_flag",
          severity: "medium",
          flag,
          detail: `Feature flag "${flag}" found in DOM but not in known flags list`,
          recommendation: `Register "${flag}" in the feature flag registry`,
        });
      }
    }

    if (disabled.length > KNOWN_FLAGS.length * 0.5) {
      findings.push({
        type: "flag_debt",
        severity: "low",
        flag: "system",
        detail: `${disabled.length} of ${KNOWN_FLAGS.length} feature flags are disabled — possible flag debt`,
        recommendation: "Review disabled flags — remove stale ones, enable ready features",
      });
    }

    this.findings = findings;
    this.activeFlags = active;
    this.disabledFlags = disabled;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, active: active.length, disabled: disabled.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, activeFlags: this.activeFlags, disabledFlags: this.disabledFlags, findings: this.findings }; }
}
