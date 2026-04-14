import { engineObserver } from "./engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { engineScheduler, type ScheduleFrequency, type EnginePriority } from "./engine-scheduler";
import type { BaseEngine } from "./base-engine";

const OPTIMIZER_INTERVAL_MS = 60_000;
const SLOW_TICK_THRESHOLD_MS = 2_000;
const HIGH_ERROR_RATE_THRESHOLD = 0.4;
const INACTIVE_ENGINE_THRESHOLD_MS = 10 * 60_000;
const FAST_ENGINE_THRESHOLD_MS = 200;
const LOW_ERROR_RATE_THRESHOLD = 0.1;
const FREQUENCY_CHANGE_COOLDOWN_MS = 5 * 60_000;

export interface OptimizerAction {
  engineId: string;
  action: "reduce_frequency" | "increase_frequency" | "reduce_priority" | "increase_priority" | "flag_duplicate" | "flag_conflict" | "flag_inactive" | "disable_rule" | "merge_rule";
  reason: string;
  previousValue?: string;
  newValue?: string;
  timestamp: number;
}

export interface EngineOptimizationReport {
  engineId: string;
  avgTickMs: number;
  errorRate: number;
  isSlow: boolean;
  hasHighErrorRate: boolean;
  isDuplicate: boolean;
  hasConflict: boolean;
  isInactive: boolean;
  recommendations: string[];
}

class EngineOptimizer {
  private engines: Map<string, BaseEngine> = new Map();
  private actionHistory: OptimizerAction[] = [];
  private optimizerInterval: ReturnType<typeof setInterval> | null = null;
  private lastRunAt = 0;
  private lastFrequencyChangeAt: Map<string, number> = new Map();

  registerEngines(engines: BaseEngine[]): void {
    for (const e of engines) {
      this.engines.set(e.id, e);
    }
  }

  start(): void {
    if (this.optimizerInterval) return;
    this.optimizerInterval = setInterval(() => this.runOptimization(), OPTIMIZER_INTERVAL_MS);
    engineObserver.log("engine-optimizer", "optimizer", "info",
      `Engine optimizer started — will run every ${OPTIMIZER_INTERVAL_MS / 60_000} minutes`);
  }

  stop(): void {
    if (this.optimizerInterval) {
      clearInterval(this.optimizerInterval);
      this.optimizerInterval = null;
    }
  }

  runOptimization(): void {
    this.lastRunAt = Date.now();
    const report = engineObserver.getReport();
    const analysisResults: EngineOptimizationReport[] = [];
    const actions: OptimizerAction[] = [];

    const domainMap = new Map<string, string[]>();

    for (const metric of report.engines) {
      const engine = this.engines.get(metric.engineId);
      if (!engine) continue;

      const domain = engine.domain;
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain)!.push(metric.engineId);

      const totalTicks = metric.tickCount;
      const errorCount = metric.errorCount;
      const avgTickMs = metric.avgDurationMs;
      const errorRate = totalTicks > 0 ? errorCount / (totalTicks + errorCount) : 0;
      const timeSinceLastTick = metric.lastTick > 0 ? Date.now() - metric.lastTick : Infinity;

      const isSlow = avgTickMs > SLOW_TICK_THRESHOLD_MS;
      const hasHighErrorRate = errorRate > HIGH_ERROR_RATE_THRESHOLD;
      const isInactive = totalTicks === 0 || timeSinceLastTick > INACTIVE_ENGINE_THRESHOLD_MS;

      const recommendations: string[] = [];

      if (isSlow) {
        recommendations.push(`Avg tick ${avgTickMs}ms > ${SLOW_TICK_THRESHOLD_MS}ms threshold`);
        if (this.canChangeFrequency(metric.engineId)) {
          const schedule = engineScheduler.getEngineSchedule(metric.engineId);
          if (schedule && schedule.frequency !== "background" && schedule.frequency !== "deep-scan") {
            const newFrequency = this.downgradeFrequency(schedule.frequency);
            if (newFrequency !== schedule.frequency) {
              engineScheduler.adjustEngineFrequency(metric.engineId, newFrequency);
              this.lastFrequencyChangeAt.set(metric.engineId, Date.now());
              const action: OptimizerAction = {
                engineId: metric.engineId,
                action: "reduce_frequency",
                reason: `Avg tick time ${avgTickMs}ms exceeds ${SLOW_TICK_THRESHOLD_MS}ms threshold`,
                previousValue: schedule.frequency,
                newValue: newFrequency,
                timestamp: Date.now(),
              };
              actions.push(action);
            }
          }
        }
      }

      if (hasHighErrorRate) {
        recommendations.push(`Error rate ${(errorRate * 100).toFixed(1)}% > ${HIGH_ERROR_RATE_THRESHOLD * 100}% threshold`);
        const schedule = engineScheduler.getEngineSchedule(metric.engineId);
        if (schedule) {
          if (schedule.priority !== "low") {
            const newPriority = this.downgradePriority(schedule.priority);
            if (newPriority !== schedule.priority) {
              engineScheduler.adjustEnginePriority(metric.engineId, newPriority);
              actions.push({
                engineId: metric.engineId,
                action: "reduce_priority",
                reason: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds ${HIGH_ERROR_RATE_THRESHOLD * 100}% — priority reduced to limit blast radius`,
                previousValue: schedule.priority,
                newValue: newPriority,
                timestamp: Date.now(),
              });
            }
          }
          if (schedule.frequency !== "background" && schedule.frequency !== "deep-scan" && this.canChangeFrequency(metric.engineId)) {
            const newFrequency = this.downgradeFrequency(schedule.frequency);
            if (newFrequency !== schedule.frequency) {
              engineScheduler.adjustEngineFrequency(metric.engineId, newFrequency);
              this.lastFrequencyChangeAt.set(metric.engineId, Date.now());
              actions.push({
                engineId: metric.engineId,
                action: "reduce_frequency",
                reason: `Error rate ${(errorRate * 100).toFixed(1)}% — reducing run frequency to contain failures`,
                previousValue: schedule.frequency,
                newValue: newFrequency,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      const isFast = avgTickMs > 0 && avgTickMs < FAST_ENGINE_THRESHOLD_MS;
      const hasLowErrorRate = totalTicks >= 10 && errorRate < LOW_ERROR_RATE_THRESHOLD;

      if (isFast && hasLowErrorRate && !isSlow && !hasHighErrorRate && this.canChangeFrequency(metric.engineId)) {
        const schedule = engineScheduler.getEngineSchedule(metric.engineId);
        if (schedule) {
          const newFrequency = this.upgradeFrequency(schedule.frequency);
          if (newFrequency !== schedule.frequency) {
            engineScheduler.adjustEngineFrequency(metric.engineId, newFrequency);
            this.lastFrequencyChangeAt.set(metric.engineId, Date.now());
            recommendations.push(`Fast engine promoted: avg ${avgTickMs}ms, error rate ${(errorRate * 100).toFixed(1)}%`);
            actions.push({
              engineId: metric.engineId,
              action: "increase_frequency",
              reason: `Engine performing well (avg ${avgTickMs}ms, ${(errorRate * 100).toFixed(1)}% errors) — promoted to run faster`,
              previousValue: schedule.frequency,
              newValue: newFrequency,
              timestamp: Date.now(),
            });
          }
        }
      }

      if (isInactive && engine.isRunning) {
        recommendations.push(`Engine inactive for ${Math.round(timeSinceLastTick / 60000)}min with no ticks`);
        actions.push({
          engineId: metric.engineId,
          action: "disable_rule",
          reason: `[Advisory] Engine inactive for ${Math.round(timeSinceLastTick / 60000)} minutes — recommend disabling rule or reducing frequency`,
          timestamp: Date.now(),
        });
      }

      analysisResults.push({
        engineId: metric.engineId,
        avgTickMs,
        errorRate,
        isSlow,
        hasHighErrorRate,
        isDuplicate: false,
        hasConflict: false,
        isInactive,
        recommendations,
      });
    }

    this.detectDuplicatesAndConflicts(domainMap, analysisResults, actions);

    for (const action of actions) {
      this.actionHistory.push(action);
    }
    if (this.actionHistory.length > 200) {
      this.actionHistory = this.actionHistory.slice(-200);
    }

    if (actions.length > 0) {
      engineObserver.log("engine-optimizer", "optimizer", "info",
        `Optimization run: ${actions.length} actions taken across ${analysisResults.length} engines`);

      platformBus.emit("engine:optimizer:run", {
        actionsCount: actions.length,
        enginesAnalyzed: analysisResults.length,
        timestamp: Date.now(),
      });
    }
  }

  private detectDuplicatesAndConflicts(
    domainMap: Map<string, string[]>,
    results: EngineOptimizationReport[],
    actions: OptimizerAction[]
  ): void {
    for (const [domain, engineIds] of domainMap) {
      if (engineIds.length <= 1) continue;

      if (engineIds.length > 2) {
        for (let i = 1; i < engineIds.length; i++) {
          const duplicateId = engineIds[i];
          const result = results.find(r => r.engineId === duplicateId);
          if (result) {
            result.isDuplicate = true;
            result.recommendations.push(`Multiple engines running on domain "${domain}" — potential duplication`);
            if (!actions.find(a => a.engineId === duplicateId && (a.action === "flag_duplicate" || a.action === "merge_rule"))) {
              const duplicateResult = result;
              if (duplicateResult.isInactive) {
                actions.push({
                  engineId: duplicateId,
                  action: "disable_rule",
                  reason: `[Advisory] Inactive duplicate on domain "${domain}" (${engineIds.length} engines) — recommend disabling`,
                  timestamp: Date.now(),
                });
              } else {
                actions.push({
                  engineId: duplicateId,
                  action: "merge_rule",
                  reason: `[Advisory] ${engineIds.length} engines share domain "${domain}" — recommend merging with primary engine ${engineIds[0]}`,
                  previousValue: duplicateId,
                  newValue: engineIds[0],
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      }

      const conflictCandidates = engineIds.filter(id => {
        const result = results.find(r => r.engineId === id);
        const schedule = engineScheduler.getEngineSchedule(id);
        return result?.hasHighErrorRate &&
          (schedule?.priority === "critical" || schedule?.priority === "high");
      });

      if (conflictCandidates.length >= 2) {
        for (const id of conflictCandidates) {
          const result = results.find(r => r.engineId === id);
          if (!result) continue;
          result.hasConflict = true;
          result.recommendations.push(
            `Conflict: ${conflictCandidates.length} high-priority engines competing on domain "${domain}" with elevated error rates`
          );
          if (!actions.find(a => a.engineId === id && a.action === "flag_conflict")) {
            const schedule = engineScheduler.getEngineSchedule(id);
            if (schedule && id !== conflictCandidates[0]) {
              const newPriority = this.downgradePriority(schedule.priority);
              if (newPriority !== schedule.priority) {
                engineScheduler.adjustEnginePriority(id, newPriority);
                actions.push({
                  engineId: id,
                  action: "flag_conflict",
                  reason: `Priority reduced to resolve conflict on domain "${domain}" — ${conflictCandidates.length} high-priority engines with high error rates`,
                  previousValue: schedule.priority,
                  newValue: newPriority,
                  timestamp: Date.now(),
                });
              } else {
                actions.push({
                  engineId: id,
                  action: "flag_conflict",
                  reason: `Conflict detected on domain "${domain}" — ${conflictCandidates.length} high-priority engines with elevated error rates`,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      }
    }
  }

  private canChangeFrequency(engineId: string): boolean {
    const lastChange = this.lastFrequencyChangeAt.get(engineId);
    if (!lastChange) return true;
    return Date.now() - lastChange >= FREQUENCY_CHANGE_COOLDOWN_MS;
  }

  private downgradeFrequency(current: ScheduleFrequency): ScheduleFrequency {
    const order: ScheduleFrequency[] = ["realtime", "high", "medium", "background", "deep-scan"];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : current;
  }

  private upgradeFrequency(current: ScheduleFrequency): ScheduleFrequency {
    const order: ScheduleFrequency[] = ["realtime", "high", "medium", "background", "deep-scan"];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : current;
  }

  private downgradePriority(current: EnginePriority): EnginePriority {
    const order: EnginePriority[] = ["critical", "high", "medium", "low"];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : current;
  }

  getActionHistory(limit = 50): OptimizerAction[] {
    return this.actionHistory.slice(-limit);
  }

  getReport() {
    return {
      lastRunAt: this.lastRunAt,
      nextRunAt: this.lastRunAt > 0 ? this.lastRunAt + OPTIMIZER_INTERVAL_MS : null,
      intervalMs: OPTIMIZER_INTERVAL_MS,
      totalActions: this.actionHistory.length,
      recentActions: this.getActionHistory(20),
      thresholds: {
        slowTickMs: SLOW_TICK_THRESHOLD_MS,
        highErrorRatePercent: HIGH_ERROR_RATE_THRESHOLD * 100,
        inactiveEngineMs: INACTIVE_ENGINE_THRESHOLD_MS,
      },
    };
  }
}

export const engineOptimizer = new EngineOptimizer();
