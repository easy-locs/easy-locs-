import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";

export type DriftCategory =
  | "code"
  | "schema"
  | "route"
  | "taxonomy"
  | "performance"
  | "seo"
  | "security"
  | "state_machine"
  | "config";

export type DriftSeverity = "none" | "minor" | "moderate" | "major" | "critical";

export interface DriftRecord {
  id: string;
  category: DriftCategory;
  severity: DriftSeverity;
  description: string;
  before: string;
  after: string;
  detected_at: number;
  source: string;
  auto_fixable: boolean;
  resolved: boolean;
  resolved_at?: number;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  data: Record<string, unknown>;
}

export interface RegressionCheck {
  id: string;
  name: string;
  category: DriftCategory;
  baseline_value: number;
  current_value: number;
  threshold: number;
  regressed: boolean;
  delta: number;
  detected_at: number;
}

export interface PastControlReport {
  timestamp: number;
  total_drifts: number;
  unresolved_drifts: number;
  regressions: number;
  blocking_regressions: number;
  snapshots_count: number;
  drift_by_category: Record<DriftCategory, number>;
  verdict: "stable" | "drifting" | "regressed" | "critical";
}

class PastControl extends BaseEngine {
  private drifts: DriftRecord[] = [];
  private snapshots: Snapshot[] = [];
  private regressions: RegressionCheck[] = [];
  private driftCounter = 0;

  constructor() {
    super({
      id: "past-control",
      name: "Past Control Engine",
      category: "god",
      intervalMs: 10 * 60 * 1000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const actions: string[] = [];
    let findings = 0;

    const unresolved = this.drifts.filter((d) => !d.resolved);
    if (unresolved.length > 0) {
      findings += unresolved.length;
      const critical = unresolved.filter((d) => d.severity === "critical");
      if (critical.length > 0) {
        actions.push(`${critical.length} critical drifts unresolved`);
      }
    }

    const activeRegressions = this.regressions.filter((r) => r.regressed);
    if (activeRegressions.length > 0) {
      findings += activeRegressions.length;
      actions.push(`${activeRegressions.length} active regressions`);
    }

    return {
      level: findings > 0 ? "detect" : "observe",
      findings,
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  takeSnapshot(label: string, data: Record<string, unknown>): Snapshot {
    const snapshot: Snapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      label,
      data,
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 200) {
      this.snapshots = this.snapshots.slice(-100);
    }
    return snapshot;
  }

  recordDrift(
    category: DriftCategory,
    severity: DriftSeverity,
    description: string,
    before: string,
    after: string,
    source: string,
    autoFixable = false
  ): DriftRecord {
    this.driftCounter++;
    const drift: DriftRecord = {
      id: `drift-${this.driftCounter}`,
      category,
      severity,
      description,
      before,
      after,
      detected_at: Date.now(),
      source,
      auto_fixable: autoFixable,
      resolved: false,
    };
    this.drifts.push(drift);
    if (this.drifts.length > 2000) {
      this.drifts = this.drifts.slice(-1000);
    }
    return drift;
  }

  resolveDrift(id: string): boolean {
    const drift = this.drifts.find((d) => d.id === id);
    if (!drift) return false;
    drift.resolved = true;
    drift.resolved_at = Date.now();
    return true;
  }

  checkRegression(
    name: string,
    category: DriftCategory,
    baselineValue: number,
    currentValue: number,
    threshold: number
  ): RegressionCheck {
    const delta = currentValue - baselineValue;
    const regressed = Math.abs(delta) > threshold && (
      (category === "performance" && delta > 0) ||
      (category !== "performance" && delta < 0)
    );

    const check: RegressionCheck = {
      id: `reg-${Date.now()}-${name}`,
      name,
      category,
      baseline_value: baselineValue,
      current_value: currentValue,
      threshold,
      regressed,
      delta,
      detected_at: Date.now(),
    };

    this.regressions.push(check);
    if (this.regressions.length > 500) {
      this.regressions = this.regressions.slice(-250);
    }

    if (regressed) {
      this.recordDrift(
        category,
        Math.abs(delta) > threshold * 2 ? "critical" : "major",
        `Regression in ${name}: baseline=${baselineValue}, current=${currentValue}, delta=${delta}`,
        String(baselineValue),
        String(currentValue),
        "regression_check"
      );
    }

    return check;
  }

  comparSnapshots(snapshotIdA: string, snapshotIdB: string): {
    diffs: Array<{ key: string; before: unknown; after: unknown }>;
    added: string[];
    removed: string[];
  } {
    const a = this.snapshots.find((s) => s.id === snapshotIdA);
    const b = this.snapshots.find((s) => s.id === snapshotIdB);

    if (!a || !b) return { diffs: [], added: [], removed: [] };

    const diffs: Array<{ key: string; before: unknown; after: unknown }> = [];
    const added: string[] = [];
    const removed: string[] = [];

    const allKeys = new Set([...Object.keys(a.data), ...Object.keys(b.data)]);

    for (const key of allKeys) {
      const inA = key in a.data;
      const inB = key in b.data;

      if (inA && !inB) {
        removed.push(key);
      } else if (!inA && inB) {
        added.push(key);
      } else if (JSON.stringify(a.data[key]) !== JSON.stringify(b.data[key])) {
        diffs.push({ key, before: a.data[key], after: b.data[key] });
      }
    }

    return { diffs, added, removed };
  }

  getUnresolvedDrifts(): DriftRecord[] {
    return this.drifts.filter((d) => !d.resolved);
  }

  getDriftsByCategory(category: DriftCategory): DriftRecord[] {
    return this.drifts.filter((d) => d.category === category);
  }

  getActiveRegressions(): RegressionCheck[] {
    return this.regressions.filter((r) => r.regressed);
  }

  getSnapshots(limit = 20): Snapshot[] {
    return this.snapshots.slice(-limit);
  }

  generateReport(): PastControlReport {
    const unresolved = this.drifts.filter((d) => !d.resolved);
    const activeRegs = this.regressions.filter((r) => r.regressed);
    const criticalDrifts = unresolved.filter((d) => d.severity === "critical");

    const driftByCategory = {} as Record<DriftCategory, number>;
    const categories: DriftCategory[] = [
      "code", "schema", "route", "taxonomy", "performance",
      "seo", "security", "state_machine", "config",
    ];
    for (const cat of categories) {
      driftByCategory[cat] = unresolved.filter((d) => d.category === cat).length;
    }

    let verdict: PastControlReport["verdict"] = "stable";
    if (criticalDrifts.length > 0) verdict = "critical";
    else if (activeRegs.length > 0) verdict = "regressed";
    else if (unresolved.length > 0) verdict = "drifting";

    return {
      timestamp: Date.now(),
      total_drifts: this.drifts.length,
      unresolved_drifts: unresolved.length,
      regressions: activeRegs.length,
      blocking_regressions: activeRegs.filter((r) => Math.abs(r.delta) > r.threshold * 2).length,
      snapshots_count: this.snapshots.length,
      drift_by_category: driftByCategory,
      verdict,
    };
  }

  getStats() {
    return {
      totalDrifts: this.drifts.length,
      unresolvedDrifts: this.drifts.filter((d) => !d.resolved).length,
      totalSnapshots: this.snapshots.length,
      totalRegressions: this.regressions.length,
      activeRegressions: this.regressions.filter((r) => r.regressed).length,
    };
  }
}

export const pastControl = new PastControl();
