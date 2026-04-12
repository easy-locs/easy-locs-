import { BaseEngine } from "./base-engine";
import { engineObserver } from "./engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerInManifest, getRepairSafetyReport } from "./repair-safety";
import { getPipelineReport } from "./repair-pipeline";
import { getProofStats } from "./proof-system";

class EngineOrchestrator {
  private engines: Map<string, BaseEngine> = new Map();
  private _booted = false;

  register(engine: BaseEngine): void {
    if (this.engines.has(engine.id)) {
      engineObserver.log(engine.id, engine.category, "warn", "Already registered, skipping");
      return;
    }
    registerInManifest(engine.id);
    this.engines.set(engine.id, engine);
  }

  registerAll(engines: BaseEngine[]): void {
    for (const e of engines) this.register(e);
  }

  startAll(): void {
    if (this._booted) return;
    this._booted = true;

    let started = 0;
    for (const engine of this.engines.values()) {
      engine.start();
      if (engine.isRunning) started++;
    }

    platformBus.emit("engine:orchestrator:booted" as any, {
      total: this.engines.size,
      started,
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log(`[engine-orchestrator] Booted ${started}/${this.engines.size} engines`);
    }
  }

  stopAll(): void {
    for (const engine of this.engines.values()) {
      engine.stop();
    }
    this._booted = false;
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

  get isBooted(): boolean {
    return this._booted;
  }

  get size(): number {
    return this.engines.size;
  }
}

export const engineOrchestrator = new EngineOrchestrator();
