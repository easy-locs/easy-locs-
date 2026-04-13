import type { SelfImprovementCycle, OmegaEngineStatus } from "../omega-types";
import { omegaPersistence } from "../omega-persistence";
import { structuredLogger } from "@/lib/observability/structured-logger";

const MAX_CYCLES = 500;
let cycleIdCounter = 0;

class SelfImprovementEngine {
  readonly name = "omega-self-improvement";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private cycles = new Map<string, SelfImprovementCycle>();
  private weaknessQueue: Array<{ domain: string; weakness: string; impact: number; recurrence: number }> = [];

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  reportWeakness(domain: string, weakness: string, impact: number, recurrence = 1): void {
    const existing = this.weaknessQueue.find((w) => w.domain === domain && w.weakness === weakness);
    if (existing) {
      existing.recurrence += recurrence;
      existing.impact = Math.max(existing.impact, impact);
    } else {
      this.weaknessQueue.push({ domain, weakness, impact, recurrence });
      if (this.weaknessQueue.length > 200) {
        this.weaknessQueue.sort((a, b) => b.impact * b.recurrence - a.impact * a.recurrence);
        this.weaknessQueue = this.weaknessQueue.slice(0, 200);
      }
    }
  }

  getClusteredWeaknesses(): Array<{ cluster: string; items: typeof this.weaknessQueue; total_impact: number }> {
    const clusters = new Map<string, typeof this.weaknessQueue>();
    for (const w of this.weaknessQueue) {
      const key = w.domain;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(w);
    }
    return [...clusters.entries()]
      .map(([cluster, items]) => ({ cluster, items, total_impact: items.reduce((s, i) => s + i.impact * i.recurrence, 0) }))
      .sort((a, b) => b.total_impact - a.total_impact);
  }

  proposeCycle(
    weaknessCluster: string,
    proposedChange: string,
    estimatedImpact: number,
    estimatedRisk: number,
    safe: boolean,
    beforeScore: number,
  ): SelfImprovementCycle {
    if (this.cycles.size >= MAX_CYCLES) {
      const oldest = [...this.cycles.entries()].sort((a, b) => a[1].created_at - b[1].created_at)[0];
      if (oldest) this.cycles.delete(oldest[0]);
    }
    const cycle: SelfImprovementCycle = {
      cycle_id: `imp_${++cycleIdCounter}`,
      weakness_cluster: weaknessCluster,
      estimated_impact: estimatedImpact,
      estimated_risk: estimatedRisk,
      proposed_change: proposedChange,
      before_score: beforeScore,
      after_score: 0,
      status: "proposed",
      safe,
      re_audit_passed: false,
      created_at: Date.now(),
    };
    this.cycles.set(cycle.cycle_id, cycle);
    this.lastRunAt = Date.now();
    omegaPersistence.writeImprovementCycle(cycle).catch(() => {});
    return cycle;
  }

  async restore(): Promise<void> {
    const persisted = await omegaPersistence.loadImprovementCycles();
    for (const c of persisted) {
      if (!this.cycles.has(c.cycle_id)) this.cycles.set(c.cycle_id, c);
    }
  }

  simulateCycle(cycleId: string): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle || cycle.status !== "proposed") return false;
    cycle.status = "simulated";
    return true;
  }

  testCycle(cycleId: string): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle || cycle.status !== "simulated") return false;
    cycle.status = "tested";
    return true;
  }

  applyCycle(cycleId: string, afterScore: number, reAuditPassed: boolean): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle || cycle.status !== "tested") return false;
    if (!cycle.safe) return false;
    cycle.after_score = afterScore;
    cycle.re_audit_passed = reAuditPassed;
    if (reAuditPassed && afterScore >= cycle.before_score) {
      cycle.status = "applied";
    } else {
      cycle.status = "rolled_back";
    }
    return true;
  }

  rejectCycle(cycleId: string): boolean {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) return false;
    cycle.status = "rejected";
    return true;
  }

  getActiveCycles(): SelfImprovementCycle[] {
    return [...this.cycles.values()]
      .filter((c) => c.status !== "applied" && c.status !== "rejected" && c.status !== "rolled_back")
      .sort((a, b) => b.estimated_impact - a.estimated_impact);
  }

  getAppliedCycles(): SelfImprovementCycle[] {
    return [...this.cycles.values()].filter((c) => c.status === "applied");
  }

  getSuccessRate(): number {
    const completed = [...this.cycles.values()].filter((c) => c.status === "applied" || c.status === "rolled_back");
    if (completed.length === 0) return 0;
    return completed.filter((c) => c.status === "applied").length / completed.length;
  }

  getStats() {
    const statusCounts: Record<string, number> = {};
    for (const [, c] of this.cycles) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }
    return {
      total_cycles: this.cycles.size,
      weakness_queue: this.weaknessQueue.length,
      by_status: statusCounts,
      success_rate: this.getSuccessRate(),
    };
  }

  async boot(): Promise<void> {
    this.status = "active";
    this.lastRunAt = Date.now();
    await this.restore().catch(() => {});
    structuredLogger.info("system", "omega_engine_boot", `SelfImprovementEngine booted | cycles: ${this.cycles.size} | weaknesses: ${this.weaknessQueue.length}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const selfImprovementEngine = new SelfImprovementEngine();
