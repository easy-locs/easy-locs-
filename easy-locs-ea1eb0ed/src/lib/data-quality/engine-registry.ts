import type { DataQualityEngine } from "./engine-base";
import type { EngineRunLog, EngineRunSummary, ExecutionMode, SweepCadence } from "./types";
import { registerNewEngine } from "@/core/command-center";

class EngineRegistry {
  private engines = new Map<string, DataQualityEngine>();
  private runHistory: EngineRunLog[] = [];

  register(engine: DataQualityEngine): void {
    this.engines.set(engine.name, engine);
    const ccResult = registerNewEngine(engine.name, engine.name, engine.name);
    if (!ccResult.success) {
      console.warn(`[data-quality-registry] CC blocked engine ${engine.name}: ${ccResult.blockedReason}`);
    }
  }

  get(name: string): DataQualityEngine | undefined {
    return this.engines.get(name);
  }

  getAll(): DataQualityEngine[] {
    return Array.from(this.engines.values());
  }

  getNames(): string[] {
    return Array.from(this.engines.keys());
  }

  runAll(mode: ExecutionMode, cadence: SweepCadence = "manual"): EngineRunLog[] {
    const logs: EngineRunLog[] = [];
    const sorted = this.getAll().sort((a, b) => {
      const pa = (a as any).config?.priority ?? 5;
      const pb = (b as any).config?.priority ?? 5;
      return pa - pb;
    });

    for (const engine of sorted) {
      try {
        const log = engine.run(mode, cadence);
        logs.push(log);
        this.runHistory.push(log);
      } catch {
        logs.push({
          engineName: engine.name,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          mode,
          cadence,
          entitiesScanned: 0,
          issuesFound: 0,
          autoFixed: 0,
          quarantined: 0,
          suppressed: 0,
          reviewNeeded: 0,
          errors: 1,
          status: "failed",
          batchSize: 0,
          message: "Engine threw during execution",
        });
      }
    }

    if (this.runHistory.length > 200) {
      this.runHistory = this.runHistory.slice(-100);
    }

    return logs;
  }

  runOne(name: string, mode: ExecutionMode, cadence: SweepCadence = "manual"): EngineRunLog | null {
    const engine = this.engines.get(name);
    if (!engine) return null;
    const log = engine.run(mode, cadence);
    this.runHistory.push(log);
    return log;
  }

  getSummaries(): EngineRunSummary[] {
    return this.getAll().map((engine) => {
      const logs = engine.getRunLogs();
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
      return {
        engineName: engine.name,
        lastRun: lastLog?.completedAt ?? "",
        status: lastLog?.status ?? "never_run",
        entitiesProcessed: lastLog?.entitiesScanned ?? 0,
        issuesFound: lastLog?.issuesFound ?? 0,
        actionsApplied:
          (lastLog?.autoFixed ?? 0) + (lastLog?.quarantined ?? 0) + (lastLog?.suppressed ?? 0),
      };
    });
  }

  getRunHistory(): readonly EngineRunLog[] {
    return this.runHistory;
  }

  getAllFindings() {
    return this.getAll().flatMap((e) => [...e.getFindings()]);
  }

  getAllRemediations() {
    return this.getAll().flatMap((e) => [...e.getRemediations()]);
  }
}

export const engineRegistry = new EngineRegistry();
