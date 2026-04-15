import type { DataQualityEngine } from "./engine-base";
import type { EngineRunLog, EngineRunSummary, ExecutionMode, SweepCadence } from "./types";

class DataQualityModuleRegistry {
  private modules = new Map<string, DataQualityEngine>();
  private runHistory: EngineRunLog[] = [];

  register(module: DataQualityEngine): void {
    this.modules.set(module.name, module);
  }

  get(name: string): DataQualityEngine | undefined {
    return this.modules.get(name);
  }

  getAll(): DataQualityEngine[] {
    return Array.from(this.modules.values());
  }

  getNames(): string[] {
    return Array.from(this.modules.keys());
  }

  runAll(mode: ExecutionMode, cadence: SweepCadence = "manual"): EngineRunLog[] {
    const logs: EngineRunLog[] = [];
    const sorted = this.getAll().sort((a, b) => {
      return a.getPriority() - b.getPriority();
    });

    for (const mod of sorted) {
      try {
        const log = mod.run(mode, cadence);
        logs.push(log);
        this.runHistory.push(log);
      } catch {
        logs.push({
          engineName: mod.name,
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
          message: "Module threw during execution",
        });
      }
    }

    if (this.runHistory.length > 200) {
      this.runHistory = this.runHistory.slice(-100);
    }

    return logs;
  }

  runOne(name: string, mode: ExecutionMode, cadence: SweepCadence = "manual"): EngineRunLog | null {
    const mod = this.modules.get(name);
    if (!mod) return null;
    const log = mod.run(mode, cadence);
    this.runHistory.push(log);
    return log;
  }

  getSummaries(): EngineRunSummary[] {
    return this.getAll().map((mod) => {
      const logs = mod.getRunLogs();
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
      return {
        engineName: mod.name,
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

export const engineRegistry = new DataQualityModuleRegistry();
