import { platformBus } from "@/lib/shared/platform-bus";
import { engineObserver } from "./engine-observer";
import type { BaseEngine } from "./base-engine";
import { ENGINE_METADATA, type EngineTier } from "@/lib/engines/engine-metadata-registry";

export type ScheduleFrequency = "realtime" | "high" | "medium" | "background" | "deep-scan";
export type EnginePriority = "critical" | "high" | "medium" | "low";

export interface EngineScheduleConfig {
  engineId: string;
  frequency: ScheduleFrequency;
  priority: EnginePriority;
  domain: string;
  customIntervalMs?: number;
}

export interface ScheduledTick {
  engineId: string;
  scheduledAt: number;
  executedAt: number | null;
  durationMs: number | null;
  skipped: boolean;
  skipReason?: string;
}

export const FREQUENCY_INTERVALS: Record<ScheduleFrequency, number> = {
  "realtime": 2_000,
  "high": 10_000,
  "medium": 45_000,
  "background": 300_000,
  "deep-scan": 3_600_000,
};

const PRIORITY_ORDER: Record<EnginePriority, number> = {
  "critical": 0,
  "high": 1,
  "medium": 2,
  "low": 3,
};

const CRITICAL_ENGINE_DOMAINS = new Set(["auth", "orbit", "payment", "payments", "wallet", "billing", "fraud"]);

const TIER_TO_PRIORITY: Record<EngineTier, EnginePriority> = {
  "critical": "critical",
  "priority": "high",
  "standard": "medium",
  "optimizable": "low",
};

const TIER_TO_FREQUENCY: Record<EngineTier, ScheduleFrequency> = {
  "critical": "high",
  "priority": "medium",
  "standard": "background",
  "optimizable": "deep-scan",
};

const IDLE_BACKOFF_TICKS = 5;
const IDLE_BACKOFF_MULTIPLIER = 1.5;
const IDLE_MAX_INTERVAL_MS = 3_600_000;

function findMetadata(engine: BaseEngine) {
  const directKey = Object.keys(ENGINE_METADATA).find(
    k => k === engine.id || k === engine.id.replace(/^sh-/, "") || k === engine.id.replace(/-orch$/, "")
  );
  return directKey ? ENGINE_METADATA[directKey] : undefined;
}

function inferPriority(engine: BaseEngine): EnginePriority {
  const meta = findMetadata(engine);
  if (meta) return TIER_TO_PRIORITY[meta.tier];

  if (CRITICAL_ENGINE_DOMAINS.has(engine.domain)) return "critical";
  if (engine.intervalMs <= 5_000) return "critical";
  if (engine.intervalMs <= 15_000) return "high";
  if (engine.intervalMs <= 60_000) return "medium";
  return "low";
}

function inferFrequency(engine: BaseEngine): ScheduleFrequency {
  const meta = findMetadata(engine);
  if (meta) return TIER_TO_FREQUENCY[meta.tier];

  const ms = engine.intervalMs;
  if (ms <= 3_000) return "realtime";
  if (ms <= 15_000) return "high";
  if (ms <= 90_000) return "medium";
  if (ms <= 600_000) return "background";
  return "deep-scan";
}

function isOptimizableTier(engine: BaseEngine): boolean {
  const meta = findMetadata(engine);
  return meta?.tier === "optimizable";
}

interface SchedulerEntry {
  engine: BaseEngine;
  config: EngineScheduleConfig;
  nextTickAt: number;
  running: boolean;
  effectiveIntervalMs: number;
  baseIntervalMs: number;
  idleTickStreak: number;
  isOptimizable: boolean;
}

class EngineScheduler {
  private entries: Map<string, SchedulerEntry> = new Map();
  private domainLocks: Map<string, string> = new Map();
  private tickHistory: ScheduledTick[] = [];
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private enabled = false;
  private busUnsubs: Array<() => void> = [];

  register(engine: BaseEngine, config?: Partial<EngineScheduleConfig>): void {
    const frequency = config?.frequency ?? inferFrequency(engine);
    const priority = config?.priority ?? inferPriority(engine);
    const baseIntervalMs = config?.customIntervalMs ?? FREQUENCY_INTERVALS[frequency];

    const fullConfig: EngineScheduleConfig = {
      engineId: engine.id,
      frequency,
      priority,
      domain: config?.domain ?? engine.domain,
      customIntervalMs: baseIntervalMs,
    };

    this.entries.set(engine.id, {
      engine,
      config: fullConfig,
      nextTickAt: Date.now() + Math.random() * baseIntervalMs * 0.3,
      running: false,
      effectiveIntervalMs: baseIntervalMs,
      baseIntervalMs,
      idleTickStreak: 0,
      isOptimizable: isOptimizableTier(engine),
    });
  }

  registerAll(engines: BaseEngine[], configs?: Map<string, Partial<EngineScheduleConfig>>): void {
    for (const engine of engines) {
      this.register(engine, configs?.get(engine.id));
    }
  }

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.schedulerInterval = setInterval(() => this.runSchedulerCycle(), 500);
    engineObserver.log("engine-scheduler", "scheduler", "info", "Engine scheduler started");

    this.busUnsubs.push(
      platformBus.on("engine:orchestrator:booted", () => { this.resetAllBackoffs(); }),
      platformBus.on("engine:domain:changed", () => { this.resetAllBackoffs(); }),
    );
  }

  stop(): void {
    this.enabled = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    for (const unsub of this.busUnsubs) {
      try { unsub(); } catch {}
    }
    this.busUnsubs = [];
    engineObserver.log("engine-scheduler", "scheduler", "info", "Engine scheduler stopped");
  }

  private resetAllBackoffs(): void {
    for (const entry of this.entries.values()) {
      if (entry.idleTickStreak > 0 || entry.effectiveIntervalMs > entry.baseIntervalMs) {
        entry.idleTickStreak = 0;
        entry.effectiveIntervalMs = entry.baseIntervalMs;
      }
    }
  }

  resetBackoffForEngine(engineId: string): void {
    const entry = this.entries.get(engineId);
    if (entry && (entry.idleTickStreak > 0 || entry.effectiveIntervalMs > entry.baseIntervalMs)) {
      entry.idleTickStreak = 0;
      entry.effectiveIntervalMs = entry.baseIntervalMs;
    }
  }

  private runSchedulerCycle(): void {
    const now = Date.now();
    const due = this.getDueEntries(now);

    for (const entry of due) {
      if (!entry.engine.isRunning) continue;
      if (entry.running) continue;
      if (this.isDomainLocked(entry.config.domain, entry.engine.id)) {
        this.recordSkip(entry.engine.id, now, "domain_locked");
        entry.nextTickAt = now + entry.effectiveIntervalMs;
        continue;
      }

      if (entry.isOptimizable) {
        this.scheduleOptimizableTick(entry, now);
      } else {
        this.executeTick(entry, now);
      }
    }
  }

  private scheduleOptimizableTick(entry: SchedulerEntry, now: number): void {
    if (typeof requestIdleCallback !== "undefined") {
      entry.running = true;
      requestIdleCallback(
        () => {
          if (!entry.engine.isRunning) {
            entry.running = false;
            return;
          }
          this.executeTick(entry, Date.now());
        },
        { timeout: 10_000 }
      );
    } else {
      this.executeTick(entry, now);
    }
  }

  private getDueEntries(now: number): SchedulerEntry[] {
    const due: SchedulerEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.nextTickAt <= now) {
        due.push(entry);
      }
    }

    due.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.config.priority];
      const pb = PRIORITY_ORDER[b.config.priority];
      if (pa !== pb) return pa - pb;
      return a.nextTickAt - b.nextTickAt;
    });

    return due;
  }

  private isDomainLocked(domain: string, requestingEngineId: string): boolean {
    const lockHolder = this.domainLocks.get(domain);
    return lockHolder !== undefined && lockHolder !== requestingEngineId;
  }

  private lockDomain(domain: string, engineId: string): void {
    this.domainLocks.set(domain, engineId);
  }

  private unlockDomain(domain: string, engineId: string): void {
    if (this.domainLocks.get(domain) === engineId) {
      this.domainLocks.delete(domain);
    }
  }

  private async executeTick(entry: SchedulerEntry, now: number): Promise<void> {
    const tickRecord: ScheduledTick = {
      engineId: entry.engine.id,
      scheduledAt: entry.nextTickAt,
      executedAt: now,
      durationMs: null,
      skipped: false,
    };

    entry.running = true;
    this.lockDomain(entry.config.domain, entry.engine.id);

    const start = Date.now();
    const findingsBefore = engineObserver.getMetric(entry.engine.id)?.totalFindings ?? 0;
    let tickFindings = 0;
    try {
      await entry.engine.executeManagedTick();
      tickRecord.durationMs = Date.now() - start;
      const findingsAfter = engineObserver.getMetric(entry.engine.id)?.totalFindings ?? findingsBefore;
      tickFindings = Math.max(0, findingsAfter - findingsBefore);
    } catch (err) {
      tickRecord.durationMs = Date.now() - start;
      engineObserver.log(entry.engine.id, "scheduler", "error",
        `Scheduled tick failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      entry.running = false;
      this.applyBackoff(entry, tickFindings);
      entry.nextTickAt = Date.now() + entry.effectiveIntervalMs;
      this.unlockDomain(entry.config.domain, entry.engine.id);
      this.recordTick(tickRecord);
    }
  }

  private applyBackoff(entry: SchedulerEntry, findings: number): void {
    if (findings === 0) {
      entry.idleTickStreak++;
      if (entry.idleTickStreak >= IDLE_BACKOFF_TICKS) {
        const next = Math.min(
          Math.round(entry.effectiveIntervalMs * IDLE_BACKOFF_MULTIPLIER),
          IDLE_MAX_INTERVAL_MS
        );
        if (next > entry.effectiveIntervalMs) {
          entry.effectiveIntervalMs = next;
          engineObserver.log(entry.engine.id, "scheduler", "info",
            `Backoff applied: interval increased to ${entry.effectiveIntervalMs}ms (idle streak: ${entry.idleTickStreak})`);
        }
        entry.idleTickStreak = 0;
      }
    } else {
      if (entry.idleTickStreak > 0 || entry.effectiveIntervalMs > entry.baseIntervalMs) {
        entry.idleTickStreak = 0;
        entry.effectiveIntervalMs = entry.baseIntervalMs;
        engineObserver.log(entry.engine.id, "scheduler", "info",
          `Backoff reset: ${findings} findings detected, interval restored to ${entry.baseIntervalMs}ms`);
      }
    }
  }

  private recordSkip(engineId: string, now: number, reason: string): void {
    this.tickHistory.push({
      engineId,
      scheduledAt: now,
      executedAt: null,
      durationMs: null,
      skipped: true,
      skipReason: reason,
    });
    if (this.tickHistory.length > 500) {
      this.tickHistory = this.tickHistory.slice(-500);
    }
  }

  private recordTick(tick: ScheduledTick): void {
    this.tickHistory.push(tick);
    if (this.tickHistory.length > 500) {
      this.tickHistory = this.tickHistory.slice(-500);
    }
  }

  private _onConfigChange: (() => void) | null = null;

  onConfigChange(callback: () => void): void {
    this._onConfigChange = callback;
  }

  private notifyConfigChange(): void {
    if (this._onConfigChange) {
      try { this._onConfigChange(); } catch {}
    }
  }

  resetEngineSlot(engineId: string): void {
    const entry = this.entries.get(engineId);
    if (!entry) return;
    if (entry.running) {
      entry.running = false;
      this.unlockDomain(entry.config.domain, engineId);
      entry.nextTickAt = Date.now() + entry.effectiveIntervalMs;
      engineObserver.log(engineId, "scheduler", "info",
        "Engine slot forcibly reset (timeout/restart recovery)");
    }
  }

  adjustEngineFrequency(engineId: string, newFrequency: ScheduleFrequency): boolean {
    const entry = this.entries.get(engineId);
    if (!entry) return false;
    entry.config.frequency = newFrequency;
    entry.baseIntervalMs = FREQUENCY_INTERVALS[newFrequency];
    entry.effectiveIntervalMs = entry.baseIntervalMs;
    entry.config.customIntervalMs = undefined;
    entry.idleTickStreak = 0;
    engineObserver.log(engineId, "scheduler", "info",
      `Frequency adjusted to ${newFrequency} (${entry.effectiveIntervalMs}ms)`);
    this.notifyConfigChange();
    return true;
  }

  adjustEnginePriority(engineId: string, newPriority: EnginePriority): boolean {
    const entry = this.entries.get(engineId);
    if (!entry) return false;
    entry.config.priority = newPriority;
    engineObserver.log(engineId, "scheduler", "info", `Priority adjusted to ${newPriority}`);
    this.notifyConfigChange();
    return true;
  }

  getEngineSchedule(engineId: string): EngineScheduleConfig | undefined {
    return this.entries.get(engineId)?.config;
  }

  getAllSchedules(): EngineScheduleConfig[] {
    return Array.from(this.entries.values()).map(e => e.config);
  }

  getTickHistory(engineId?: string, limit = 50): ScheduledTick[] {
    const filtered = engineId
      ? this.tickHistory.filter(t => t.engineId === engineId)
      : this.tickHistory;
    return filtered.slice(-limit);
  }

  getReport() {
    const schedules = this.getAllSchedules();
    const byFrequency: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const s of schedules) {
      byFrequency[s.frequency] = (byFrequency[s.frequency] || 0) + 1;
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
    }

    const recentTicks = this.tickHistory.slice(-100);
    const skippedCount = recentTicks.filter(t => t.skipped).length;
    const executedTicks = recentTicks.filter(t => !t.skipped && t.durationMs !== null);
    const avgDurationMs = executedTicks.length > 0
      ? Math.round(executedTicks.reduce((s, t) => s + (t.durationMs ?? 0), 0) / executedTicks.length)
      : 0;

    return {
      enabled: this.enabled,
      totalScheduled: schedules.length,
      byFrequency,
      byPriority,
      activeDomainLocks: Array.from(this.domainLocks.keys()),
      recentSkips: skippedCount,
      avgTickDurationMs: avgDurationMs,
      schedules,
    };
  }
}

export const engineScheduler = new EngineScheduler();
