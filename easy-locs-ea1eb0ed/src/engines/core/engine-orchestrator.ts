import { BaseEngine } from "./base-engine";
import { engineObserver, type EngineMetric } from "./engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerInManifest, getRepairSafetyReport, registerStormGuardCheck } from "./repair-safety";
import { getPipelineReport } from "./repair-pipeline";
import { getProofStats } from "./proof-system";
import { engineHealthMonitor } from "./engine-health-monitor";
import { engineScheduler, type ScheduleFrequency, type EnginePriority } from "./engine-scheduler";
import { engineStormGuard } from "./engine-storm-guard";
import { engineSharedContext } from "./engine-shared-context";
import { engineOptimizer } from "./engine-optimizer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerNewEngine } from "@/core/command-center";

const CRITICAL_DOMAINS = new Set(["auth", "orbit", "payment", "payments", "wallet", "billing", "fraud"]);
const STATE_STORAGE_KEY = "el-engine-orchestrator-state";
const SUPABASE_STATE_TABLE = "engine_orchestrator_state";

async function supabaseFetchOrchestratorState(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await (supabase as SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>)
      .from(SUPABASE_STATE_TABLE)
      .select("payload")
      .eq("state_key", "main")
      .single();
    if (error || !data) return null;
    const row = data as { payload: string };
    return typeof row.payload === "string" ? row.payload : null;
  } catch {
    return null;
  }
}

async function supabaseUpsertOrchestratorState(supabase: SupabaseClient, payload: string): Promise<void> {
  try {
    await (supabase as SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>)
      .from(SUPABASE_STATE_TABLE)
      .upsert({ state_key: "main", payload, updated_at: new Date().toISOString() });
  } catch {}
}

interface EngineScheduleSnapshot {
  engineId: string;
  frequency: string;
  priority: string;
}

interface OrchestratorState {
  bootedAt: number;
  engineIds: string[];
  schedules: EngineScheduleSnapshot[];
  persistedAt?: number;
  version: number;
}

export type StartupPhase = "immediate" | "deferred" | "late";

const PHASE_CONFIG: Record<StartupPhase, { delayMs: number; idle: boolean }> = {
  immediate: { delayMs: 0, idle: false },
  deferred:  { delayMs: 500, idle: false },
  late:      { delayMs: 5_000, idle: true },
};

interface StartupTaskOptions {
  phase?: StartupPhase;
}

class EngineOrchestrator {
  private engines: Map<string, BaseEngine> = new Map();
  private blockedEngineIds: Set<string> = new Set();
  private _booted = false;
  private _bootedAt = 0;
  private startupTasks: Map<string, { fn: () => (() => void) | void; options?: StartupTaskOptions }> = new Map();
  private startupTeardowns: Array<() => void> = [];

  register(engine: BaseEngine): void {
    if (this.engines.has(engine.id)) {
      engineObserver.log(engine.id, engine.category, "warn", "Already registered, skipping");
      return;
    }
    registerInManifest(engine.id);
    this.engines.set(engine.id, engine);

    engineHealthMonitor.registerEngine(engine);

    const isCritical = CRITICAL_DOMAINS.has(engine.domain) || engine.intervalMs <= 5_000;
    if (isCritical) {
      engineStormGuard.registerCriticalEngine(engine.id);
    }

    const ccResult = registerNewEngine(engine.id, engine.name, engine.id);
    if (!ccResult.success) {
      this.blockedEngineIds.add(engine.id);
      engineObserver.log(engine.id, engine.category, "warn", `Command Center blocked engine registration — engine will not start: ${ccResult.blockedReason}`);
    }
  }

  registerAll(engines: BaseEngine[]): void {
    for (const e of engines) this.register(e);
  }

  registerStartupTask(taskId: string, fn: () => (() => void) | void, options?: StartupTaskOptions): void {
    this.startupTasks.set(taskId, { fn, options });
  }

  startAll(): void {
    if (this._booted) return;
    if (import.meta.env.MODE === "test" && !import.meta.env.VITEST_ALLOW_ENGINES) return;
    this._booted = true;
    this._bootedAt = Date.now();

    for (const [taskId, { fn, options }] of this.startupTasks) {
      const runTask = () => {
        if (!this._booted) return;
        try {
          const teardown = fn();
          if (typeof teardown === "function") this.startupTeardowns.push(teardown);
        } catch (err) {
          engineObserver.log(taskId, "orchestrator", "error",
            `Startup task failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };

      const phase = options?.phase ?? "immediate";
      const { delayMs, idle } = PHASE_CONFIG[phase];

      if (delayMs > 0) {
        const timerId = setTimeout(() => {
          if (!this._booted) return;
          if (idle) {
            const cbId = requestIdleCallback(runTask, { timeout: 30_000 });
            this.startupTeardowns.push(() => cancelIdleCallback(cbId));
          } else {
            runTask();
          }
        }, delayMs);
        this.startupTeardowns.push(() => clearTimeout(timerId));
      } else if (idle) {
        const cbId = requestIdleCallback(runTask, { timeout: 30_000 });
        this.startupTeardowns.push(() => cancelIdleCallback(cbId));
      } else {
        runTask();
      }
    }

    engineSharedContext.initialize();
    engineStormGuard.start();
    registerStormGuardCheck((engineId) => engineStormGuard.isEnginePaused(engineId));
    engineStormGuard.onEngineSafeMode((engineId, reason) => {
      engineHealthMonitor.enterSafeModeFromStormGuard(engineId, reason);
    });
    engineHealthMonitor.start();

    for (const engine of this.engines.values()) {
      engine.enableSchedulerMode();
    }

    engineScheduler.registerAll(Array.from(this.engines.values()));
    engineScheduler.start();

    engineOptimizer.registerEngines(Array.from(this.engines.values()));
    engineOptimizer.start();

    let started = 0;
    for (const engine of this.engines.values()) {
      if (this.blockedEngineIds.has(engine.id)) {
        engineObserver.log(engine.id, engine.category, "warn", "Skipped start — blocked by Command Center at registration");
        continue;
      }
      engine.start();
      if (engine.isRunning) {
        started++;
        engineHealthMonitor.markEngineRunning(engine.id);
      }
    }

    engineScheduler.onConfigChange(() => this.persistState());
    this.restoreState();
    this.persistState();

    platformBus.emit("engine:orchestrator:booted", {
      total: this.engines.size,
      started,
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log(`[engine-orchestrator] Booted ${started}/${this.engines.size} engines`);
    }
  }

  stopAll(): void {
    for (const teardown of this.startupTeardowns) {
      try { teardown(); } catch {}
    }
    this.startupTeardowns = [];

    for (const engine of this.engines.values()) {
      engine.stop();
      engineHealthMonitor.markEngineDisabled(engine.id);
    }
    engineScheduler.stop();
    engineHealthMonitor.stop();
    engineStormGuard.stop();
    engineOptimizer.stop();
    this._booted = false;
  }

  autoRestartFailedEngines(): void {
    const report = engineHealthMonitor.getReport();
    let restarted = 0;
    for (const entry of report.engines) {
      if (entry.inSafeMode) {
        const recovered = engineHealthMonitor.recoverFromSafeMode(entry.engineId);
        if (recovered) restarted++;
      } else if (entry.status === "crashed" || entry.status === "frozen" || entry.status === "timeout") {
        const restarted2 = engineHealthMonitor.restartEngine(entry.engineId);
        if (restarted2) restarted++;
      }
    }
    if (restarted > 0) {
      engineObserver.log("engine-orchestrator", "orchestrator", "info",
        `Auto-restarted ${restarted} failed engines`);
    }
  }

  scheduleEngineCycles(): void {
    engineScheduler.start();
  }

  enforceExecutionPriority(): void {
    engineOptimizer.runOptimization();
  }

  getEngine(id: string): BaseEngine | undefined {
    return this.engines.get(id);
  }

  getEnginesByCategory(category: string): BaseEngine[] {
    return Array.from(this.engines.values()).filter(e => e.category === category);
  }

  getEnginesByDomain(domain: string): BaseEngine[] {
    return Array.from(this.engines.values()).filter(e => e.domain === domain);
  }

  getAllStats() {
    return Array.from(this.engines.values()).map(e => e.stats);
  }

  getEngineRuntimeStats() {
    const healthReport = engineHealthMonitor.getReport();
    const schedulerReport = engineScheduler.getReport();
    const stormReport = engineStormGuard.getReport();
    const optimizerReport = engineOptimizer.getReport();
    const sharedContextStats = engineSharedContext.getStats();
    const observerReport = engineObserver.getReport();

    const engineDetails = Array.from(this.engines.values()).map(engine => {
      const stats = engine.stats;
      const health = engineHealthMonitor.getHealthStatus(engine.id);
      const schedule = engineScheduler.getEngineSchedule(engine.id);
      const metric = (observerReport.engines as EngineMetric[]).find(m => m.engineId === engine.id);
      const errorRate = metric
        ? (metric.tickCount + metric.errorCount > 0
            ? metric.errorCount / (metric.tickCount + metric.errorCount)
            : 0)
        : 0;
      const successRate = 1 - errorRate;
      const correctionsApplied = engineStormGuard.getEngineTotalCorrections(engine.id);

      return {
        id: engine.id,
        name: engine.name,
        category: engine.category,
        domain: engine.domain,
        running: engine.isRunning,
        status: health?.status ?? (engine.isRunning ? "running" : "disabled"),
        lastTick: stats.lastTick,
        tickCount: stats.tickCount,
        errorCount: stats.errorCount,
        avgTickDurationMs: metric?.avgDurationMs ?? 0,
        successRate,
        consecutiveFailures: health?.consecutiveFailures ?? 0,
        inSafeMode: health?.inSafeMode ?? false,
        totalRestarts: health?.totalRestarts ?? 0,
        correctionsApplied,
        priorityLevel: schedule?.priority ?? "medium",
        frequencyLevel: schedule?.frequency ?? "medium",
        intervalMs: engine.intervalMs,
      };
    });

    return {
      booted: this._booted,
      bootedAt: this._bootedAt,
      totalEngines: this.engines.size,
      runningEngines: engineDetails.filter(e => e.running).length,
      health: healthReport,
      scheduler: schedulerReport,
      storm: stormReport,
      optimizer: optimizerReport,
      sharedContext: sharedContextStats,
      engines: engineDetails,
      recentIncidents: engineHealthMonitor.getRecentIncidents(100),
    };
  }

  getReport() {
    return {
      orchestrator: {
        booted: this._booted,
        totalEngines: this.engines.size,
        runningEngines: Array.from(this.engines.values()).filter(e => e.isRunning).length,
      },
      ...engineObserver.getReport(),
      repairSafety: getRepairSafetyReport(),
      repairPipeline: getPipelineReport(),
      proofSystem: getProofStats(),
    };
  }

  private persistState(): void {
    try {
      const schedules = engineScheduler.getAllSchedules().map(s => ({
        engineId: s.engineId,
        frequency: s.frequency,
        priority: s.priority,
      }));
      const state: OrchestratorState = {
        bootedAt: this._bootedAt,
        engineIds: Array.from(this.engines.keys()),
        schedules,
        persistedAt: Date.now(),
        version: 1,
      };
      const payload = JSON.stringify(state);
      sessionStorage.setItem(STATE_STORAGE_KEY, payload);
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabaseUpsertOrchestratorState(supabase, payload);
      }).catch(() => {});
    } catch {}
  }

  restoreState(): boolean {
    const VALID_FREQUENCIES = new Set<ScheduleFrequency>(["realtime", "high", "medium", "background", "deep-scan"]);
    const VALID_PRIORITIES = new Set<EnginePriority>(["critical", "high", "medium", "low"]);

    const applyState = (state: OrchestratorState): boolean => {
      if (state.version !== 1) return false;
      let restored = 0;
      for (const snap of state.schedules || []) {
        const freq = snap.frequency as ScheduleFrequency;
        const pri = snap.priority as EnginePriority;
        if (!VALID_FREQUENCIES.has(freq) || !VALID_PRIORITIES.has(pri)) continue;
        const freqOk = engineScheduler.adjustEngineFrequency(snap.engineId, freq);
        const priOk = engineScheduler.adjustEnginePriority(snap.engineId, pri);
        if (freqOk || priOk) restored++;
      }
      engineObserver.log("engine-orchestrator", "orchestrator", "info",
        `State restored from boot at ${new Date(state.bootedAt).toISOString()} — ${restored} schedule configs, persisted ${state.persistedAt ? new Date(state.persistedAt).toISOString() : "unknown"}`);
      return true;
    };

    let localState: OrchestratorState | null = null;
    try {
      const raw = sessionStorage.getItem(STATE_STORAGE_KEY);
      if (raw) localState = JSON.parse(raw) as OrchestratorState;
    } catch {}

    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabaseFetchOrchestratorState(supabase).then(payload => {
        if (!payload) return;
        try {
          const remoteState = JSON.parse(payload) as OrchestratorState;
          const remoteTs = remoteState.persistedAt ?? 0;
          const localTs = localState?.persistedAt ?? 0;
          if (remoteTs > localTs) {
            applyState(remoteState);
            try { sessionStorage.setItem(STATE_STORAGE_KEY, payload); } catch {}
            engineObserver.log("engine-orchestrator", "orchestrator", "info",
              "Runtime state restored from Supabase (remote was newer)");
          }
        } catch {}
      });
    }).catch(() => {});

    if (localState) {
      return applyState(localState);
    }
    return false;
  }

  get isBooted(): boolean {
    return this._booted;
  }

  get size(): number {
    return this.engines.size;
  }

  reset(): void {
    this.stopAll();
    this.engines.clear();
    this._booted = false;
    this._bootedAt = 0;
  }
}

export const engineOrchestrator = new EngineOrchestrator();
