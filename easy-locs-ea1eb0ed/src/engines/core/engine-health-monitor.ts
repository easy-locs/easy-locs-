import { platformBus } from "@/lib/shared/platform-bus";
import { engineObserver } from "./engine-observer";
import type { BaseEngine } from "./base-engine";
import { engineScheduler, FREQUENCY_INTERVALS } from "./engine-scheduler";

export type EngineHealthStatus = "running" | "crashed" | "frozen" | "timeout" | "restarting" | "safe_mode" | "disabled";

export interface EngineIncident {
  id: string;
  engineId: string;
  type: "crash" | "freeze" | "timeout" | "restart" | "safe_mode" | "error_spike";
  timestamp: number;
  detail: string;
  backoffMs?: number;
  attempt?: number;
}

export interface EngineHealthEntry {
  engineId: string;
  status: EngineHealthStatus;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastHealthyAt: number | null;
  nextRestartAt: number | null;
  inSafeMode: boolean;
  totalRestarts: number;
  totalCrashes: number;
  totalFreezes: number;
  totalTimeouts: number;
}

const MAX_INCIDENTS = 100;
const FREEZE_MULTIPLIER = 2;
const TICK_TIMEOUT_MS = 30_000;
const ERROR_SPIKE_WINDOW_MS = 60_000;
const ERROR_SPIKE_THRESHOLD = 5;
const MAX_CONSECUTIVE_FAILURES = 5;

const BACKOFF_SEQUENCE = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000];

function computeBackoffMs(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_SEQUENCE.length - 1);
  return BACKOFF_SEQUENCE[idx];
}

class EngineHealthMonitor {
  private engineMap: Map<string, BaseEngine> = new Map();
  private healthMap: Map<string, EngineHealthEntry> = new Map();
  private incidents: EngineIncident[] = [];
  private restartTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private incidentCounter = 0;
  private errorTimestamps: Map<string, number[]> = new Map();

  registerEngine(engine: BaseEngine): void {
    this.engineMap.set(engine.id, engine);
    this.healthMap.set(engine.id, {
      engineId: engine.id,
      status: "disabled",
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastHealthyAt: null,
      nextRestartAt: null,
      inSafeMode: false,
      totalRestarts: 0,
      totalCrashes: 0,
      totalFreezes: 0,
      totalTimeouts: 0,
    });
    this.errorTimestamps.set(engine.id, []);
  }

  registerEngines(engines: BaseEngine[]): void {
    for (const e of engines) this.registerEngine(e);
  }

  start(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.runHealthChecks(), 5_000);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    for (const timer of this.restartTimers.values()) clearTimeout(timer);
    this.restartTimers.clear();
  }

  recordEngineError(engineId: string): void {
    const timestamps = this.errorTimestamps.get(engineId) ?? [];
    const now = Date.now();
    timestamps.push(now);
    const windowStart = now - ERROR_SPIKE_WINDOW_MS;
    const recent = timestamps.filter(t => t >= windowStart);
    this.errorTimestamps.set(engineId, recent);

    if (recent.length >= ERROR_SPIKE_THRESHOLD) {
      const health = this.healthMap.get(engineId);
      const engine = this.engineMap.get(engineId);
      if (health && engine && !health.inSafeMode && health.status !== "restarting") {
        this.handleErrorSpike(engine, health, recent.length);
      }
    }
  }

  private runHealthChecks(): void {
    const now = Date.now();
    for (const [id, engine] of this.engineMap) {
      const health = this.healthMap.get(id);
      if (!health) continue;
      if (health.inSafeMode) continue;
      if (health.status === "restarting") continue;

      const stats = engine.stats;

      if (!engine.isRunning && health.status !== "disabled" && health.status !== "restarting") {
        this.handleCrash(engine, health, "Engine stopped unexpectedly");
        continue;
      }

      if (engine.isRunning && stats.tickInFlight && stats.tickStartedAt > 0) {
        const inFlightDuration = now - stats.tickStartedAt;
        if (inFlightDuration > TICK_TIMEOUT_MS) {
          this.handleTickTimeout(engine, health, inFlightDuration);
          continue;
        }
      }

      if (engine.isRunning && stats.lastTick > 0 && !stats.tickInFlight) {
        const timeSinceLastTick = now - stats.lastTick;
        const schedule = engineScheduler.getEngineSchedule(engine.id);
        const effectiveIntervalMs = schedule
          ? (schedule.customIntervalMs ?? FREQUENCY_INTERVALS[schedule.frequency] ?? engine.intervalMs)
          : engine.intervalMs;
        const freezeThresholdMs = effectiveIntervalMs * FREEZE_MULTIPLIER;
        if (timeSinceLastTick > freezeThresholdMs && timeSinceLastTick > 10_000) {
          this.handleFreeze(engine, health, timeSinceLastTick);
          continue;
        }
      }

      if (engine.isRunning && health.status !== "running") {
        health.status = "running";
        health.lastHealthyAt = now;
      }

      if (
        engine.isRunning &&
        health.consecutiveFailures > 0 &&
        stats.lastTick > 0 &&
        stats.lastTick > (health.lastFailureAt ?? 0)
      ) {
        engineObserver.log(id, "health-monitor", "info",
          `Engine healthy tick confirmed — resetting failure streak of ${health.consecutiveFailures}`);
        health.consecutiveFailures = 0;
        health.lastHealthyAt = now;
      }
    }
  }

  private handleCrash(engine: BaseEngine, health: EngineHealthEntry, reason: string): void {
    health.consecutiveFailures++;
    health.lastFailureAt = Date.now();
    health.totalCrashes++;
    health.status = "crashed";

    this.addIncident(engine.id, "crash", reason, health.consecutiveFailures);
    engineObserver.log(engine.id, "health-monitor", "error",
      `Engine crashed: ${reason} (failure #${health.consecutiveFailures})`);

    platformBus.emit("engine:health:crash", {
      engineId: engine.id,
      reason,
      consecutiveFailures: health.consecutiveFailures,
      timestamp: Date.now(),
    });

    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.enterSafeMode(engine, health);
    } else {
      this.scheduleRestart(engine, health);
    }
  }

  private handleFreeze(engine: BaseEngine, health: EngineHealthEntry, staleDurationMs: number): void {
    health.consecutiveFailures++;
    health.lastFailureAt = Date.now();
    health.totalFreezes++;
    health.status = "frozen";

    const detail = `Engine frozen for ${Math.round(staleDurationMs / 1000)}s (expected tick every ${Math.round(engine.intervalMs / 1000)}s)`;
    this.addIncident(engine.id, "freeze", detail, health.consecutiveFailures);
    engineObserver.log(engine.id, "health-monitor", "error", detail);

    platformBus.emit("engine:health:freeze", {
      engineId: engine.id,
      staleDurationMs,
      consecutiveFailures: health.consecutiveFailures,
      timestamp: Date.now(),
    });

    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.enterSafeMode(engine, health);
    } else {
      engineScheduler.resetEngineSlot(engine.id);
      engine.stop();
      this.scheduleRestart(engine, health);
    }
  }

  private handleTickTimeout(engine: BaseEngine, health: EngineHealthEntry, inFlightDurationMs: number): void {
    health.consecutiveFailures++;
    health.lastFailureAt = Date.now();
    health.totalTimeouts++;
    health.status = "timeout";

    const detail = `Tick in-flight for ${Math.round(inFlightDurationMs / 1000)}s — timeout threshold is ${TICK_TIMEOUT_MS / 1000}s`;
    this.addIncident(engine.id, "timeout", detail, health.consecutiveFailures);
    engineObserver.log(engine.id, "health-monitor", "error", detail);

    platformBus.emit("engine:health:timeout", {
      engineId: engine.id,
      inFlightDurationMs,
      consecutiveFailures: health.consecutiveFailures,
      timestamp: Date.now(),
    });

    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.enterSafeMode(engine, health);
    } else {
      engineScheduler.resetEngineSlot(engine.id);
      engine.stop();
      this.scheduleRestart(engine, health);
    }
  }

  private handleErrorSpike(engine: BaseEngine, health: EngineHealthEntry, errorCount: number): void {
    health.consecutiveFailures++;
    health.lastFailureAt = Date.now();
    health.totalCrashes++;
    health.status = "crashed";

    const detail = `Error spike: ${errorCount} errors in ${ERROR_SPIKE_WINDOW_MS / 1000}s`;
    this.addIncident(engine.id, "error_spike", detail, health.consecutiveFailures);
    engineObserver.log(engine.id, "health-monitor", "error", detail);

    platformBus.emit("engine:health:crash", {
      engineId: engine.id,
      reason: detail,
      consecutiveFailures: health.consecutiveFailures,
      timestamp: Date.now(),
    });

    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.enterSafeMode(engine, health);
    } else {
      engineScheduler.resetEngineSlot(engine.id);
      engine.stop();
      this.scheduleRestart(engine, health);
    }
  }

  private scheduleRestart(engine: BaseEngine, health: EngineHealthEntry): void {
    const backoffMs = computeBackoffMs(health.consecutiveFailures - 1);
    health.status = "restarting";
    health.nextRestartAt = Date.now() + backoffMs;
    health.totalRestarts++;

    engineObserver.log(engine.id, "health-monitor", "warn",
      `Scheduling restart in ${backoffMs}ms (attempt ${health.consecutiveFailures})`);

    const timer = setTimeout(() => {
      this.restartTimers.delete(engine.id);
      if (health.inSafeMode) return;

      try {
        engine.start();
        health.nextRestartAt = null;

        if (!engine.isRunning) {
          health.status = "disabled";
          engineObserver.log(engine.id, "health-monitor", "warn",
            `Engine.start() returned without activating engine — marking disabled`);
          return;
        }

        health.status = "running";
        this.addIncident(engine.id, "restart",
          `Restarted after backoff ${backoffMs}ms`, health.totalRestarts);
        engineObserver.log(engine.id, "health-monitor", "info",
          `Engine restarted after ${backoffMs}ms backoff (streak=${health.consecutiveFailures})`);

        platformBus.emit("engine:health:restarted", {
          engineId: engine.id,
          backoffMs,
          totalRestarts: health.totalRestarts,
          timestamp: Date.now(),
        });
      } catch (err) {
        health.status = "crashed";
        health.consecutiveFailures++;
        health.totalCrashes++;
        engineObserver.log(engine.id, "health-monitor", "error",
          `Restart failed: ${String(err)}`);
        if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.enterSafeMode(engine, health);
        } else {
          this.scheduleRestart(engine, health);
        }
      }
    }, backoffMs);

    this.restartTimers.set(engine.id, timer);
  }

  private enterSafeMode(engine: BaseEngine, health: EngineHealthEntry): void {
    health.inSafeMode = true;
    health.status = "safe_mode";
    engine.stop();

    this.addIncident(engine.id, "safe_mode",
      `Safe mode after ${health.consecutiveFailures} consecutive failures`, health.consecutiveFailures);

    engineObserver.log(engine.id, "health-monitor", "error",
      `Engine entered safe mode after ${health.consecutiveFailures} consecutive failures`);

    platformBus.emit("engine:health:safe_mode", {
      engineId: engine.id,
      consecutiveFailures: health.consecutiveFailures,
      timestamp: Date.now(),
    });
  }

  enterSafeModeFromStormGuard(engineId: string, reason: string): void {
    const health = this.healthMap.get(engineId);
    const engine = this.engineMap.get(engineId);
    if (!health || !engine || health.inSafeMode) return;
    health.inSafeMode = true;
    health.status = "safe_mode";
    engineScheduler.resetEngineSlot(engineId);
    engine.stop();
    this.addIncident(engineId, "safe_mode",
      `Storm guard safe mode: ${reason}`, health.consecutiveFailures);
    engineObserver.log(engineId, "health-monitor", "error",
      `Engine entered safe mode via storm guard: ${reason}`);
  }

  recoverFromSafeMode(engineId: string): boolean {
    const health = this.healthMap.get(engineId);
    const engine = this.engineMap.get(engineId);
    if (!health || !engine || !health.inSafeMode) return false;

    health.inSafeMode = false;
    health.consecutiveFailures = 0;
    health.status = "restarting";

    engineObserver.log(engineId, "health-monitor", "info", "Manually recovering from safe mode");
    this.scheduleRestart(engine, health);
    return true;
  }

  restartEngine(engineId: string): boolean {
    const health = this.healthMap.get(engineId);
    const engine = this.engineMap.get(engineId);
    if (!health || !engine) return false;
    if (health.inSafeMode) return false;
    if (health.status === "restarting") return false;

    if (engine.isRunning) engine.stop();

    const previousStatus = health.status;
    health.status = "restarting";
    health.totalRestarts++;

    try {
      engine.start();
      health.status = "running";
      health.consecutiveFailures = 0;
      health.lastHealthyAt = Date.now();
      engineObserver.log(engineId, "health-monitor", "info",
        `Engine manually restarted from status: ${previousStatus}`);
      return true;
    } catch (err) {
      health.consecutiveFailures++;
      health.totalCrashes++;
      this.scheduleRestart(engine, health);
      return false;
    }
  }

  markEngineRunning(engineId: string): void {
    const health = this.healthMap.get(engineId);
    if (!health) return;
    health.status = "running";
    health.lastHealthyAt = Date.now();
    health.consecutiveFailures = 0;
  }

  markEngineDisabled(engineId: string): void {
    const health = this.healthMap.get(engineId);
    if (health) health.status = "disabled";
  }

  private addIncident(
    engineId: string,
    type: EngineIncident["type"],
    detail: string,
    attempt?: number,
  ): EngineIncident {
    const incident: EngineIncident = {
      id: `inc-${++this.incidentCounter}-${Date.now()}`,
      engineId,
      type,
      timestamp: Date.now(),
      detail,
      attempt,
    };
    this.incidents.push(incident);
    if (this.incidents.length > MAX_INCIDENTS) {
      this.incidents = this.incidents.slice(-MAX_INCIDENTS);
    }
    return incident;
  }

  getHealthStatus(engineId: string): EngineHealthEntry | undefined {
    return this.healthMap.get(engineId);
  }

  getAllHealthStatuses(): EngineHealthEntry[] {
    return Array.from(this.healthMap.values());
  }

  getRecentIncidents(limit = 100): EngineIncident[] {
    return this.incidents.slice(-limit);
  }

  getIncidentsForEngine(engineId: string, limit = 20): EngineIncident[] {
    return this.incidents.filter(i => i.engineId === engineId).slice(-limit);
  }

  getReport() {
    const statuses = this.getAllHealthStatuses();
    const running = statuses.filter(s => s.status === "running").length;
    const crashed = statuses.filter(s => s.status === "crashed").length;
    const frozen = statuses.filter(s => s.status === "frozen").length;
    const timedOut = statuses.filter(s => s.status === "timeout").length;
    const safeModes = statuses.filter(s => s.inSafeMode).length;
    const restarting = statuses.filter(s => s.status === "restarting").length;

    return {
      totalEngines: statuses.length,
      running,
      crashed,
      frozen,
      timedOut,
      safeModes,
      restarting,
      healthScore: statuses.length > 0
        ? Math.round((running / Math.max(statuses.length, 1)) * 100)
        : 100,
      recentIncidents: this.getRecentIncidents(20),
      engines: statuses,
    };
  }
}

export const engineHealthMonitor = new EngineHealthMonitor();
