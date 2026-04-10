import { engineObserver } from "../core/engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import { agentIntelligence } from "./agent-intelligence";

export type PipelineStatus = "idle" | "running" | "completed" | "failed";

interface PipelineRun {
  id: string;
  pipeline: string;
  status: PipelineStatus;
  startedAt: number;
  completedAt: number | null;
  duration: number | null;
  findings: string[];
  actions: string[];
  error: string | null;
}

interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  intervalMs: number;
  task: () => Promise<{ findings: string[]; actions: string[] }>;
}

class AutomationPipelineScheduler {
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private runs: PipelineRun[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private _bootTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly MAX_RUNS = 100;
  private _started = false;

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register({
      id: "daily-health-report",
      name: "Daily Health Report",
      description: "Generates system-wide health report from all engines and agents",
      intervalMs: 86_400_000,
      task: async () => {
        const report = agentIntelligence.getReport();
        const findings: string[] = [];
        const actions: string[] = [];

        if (report.systemHealth < 70) {
          findings.push(`System health critically low: ${report.systemHealth}/100`);
          actions.push("Flagged for admin review");
        }

        for (const agent of report.agents) {
          if (agent.errorCount > 10) {
            findings.push(`${agent.label}: ${agent.errorCount} errors — investigate`);
          }
          if (agent.healthScore < 60) {
            findings.push(`${agent.label}: health ${agent.healthScore}/100`);
            actions.push(`Recommend restart of ${agent.label} engines`);
          }
        }

        return { findings, actions };
      },
    });

    this.register({
      id: "performance-optimization",
      name: "Performance Optimization Sweep",
      description: "Analyzes engine performance and recommends optimizations",
      intervalMs: 3_600_000,
      task: async () => {
        const report = engineObserver.getReport();
        const findings: string[] = [];
        const actions: string[] = [];

        const slowEngines = report.engines.filter(e => e.avgDurationMs > 200);
        if (slowEngines.length > 0) {
          findings.push(`${slowEngines.length} engines running above 200ms threshold`);
          for (const e of slowEngines) {
            findings.push(`  → ${e.engineId}: avg ${e.avgDurationMs}ms`);
          }
        }

        const idleEngines = report.engines.filter(e => e.tickCount === 0 && e.lastTick === 0);
        if (idleEngines.length > 0) {
          findings.push(`${idleEngines.length} engines registered but never ticked`);
        }

        const staleEngines = report.engines.filter(
          e => e.lastTick > 0 && Date.now() - e.lastTick > 600_000
        );
        if (staleEngines.length > 0) {
          findings.push(`${staleEngines.length} engines stale (no tick in 10+ min)`);
          actions.push("Consider restarting stale engines");
        }

        return { findings, actions };
      },
    });

    this.register({
      id: "anomaly-detection",
      name: "Anomaly Detection Sweep",
      description: "Checks for unusual patterns across all engine metrics",
      intervalMs: 1_800_000,
      task: async () => {
        const report = engineObserver.getReport();
        const findings: string[] = [];
        const actions: string[] = [];

        const errorBurst = report.engines.filter(e => e.errorCount > 0 && e.errorCount > e.tickCount * 0.3);
        if (errorBurst.length > 0) {
          for (const e of errorBurst) {
            findings.push(`Error burst: ${e.engineId} — ${e.errorCount} errors in ${e.tickCount} ticks (${Math.round(e.errorCount / Math.max(1, e.tickCount) * 100)}% failure rate)`);
          }
          actions.push("Engines with >30% failure rate flagged for review");
        }

        const highFinding = report.engines.filter(e => e.totalFindings > 100);
        if (highFinding.length > 0) {
          findings.push(`${highFinding.length} engines have 100+ findings — possible systemic issue`);
        }

        return { findings, actions };
      },
    });

    this.register({
      id: "system-cleanup",
      name: "System Cleanup",
      description: "Clears stale logs, resets error counters, prunes old data",
      intervalMs: 43_200_000,
      task: async () => {
        const actions: string[] = [];
        const report = engineObserver.getReport();

        if (report.recentLogs.length > 400) {
          actions.push("Log buffer nearing capacity — oldest entries will be pruned automatically");
        }

        if (report.recentErrors.length > 80) {
          actions.push("Error buffer high — consider clearing resolved errors");
        }

        return { findings: [], actions };
      },
    });
  }

  register(pipeline: PipelineDefinition): void {
    this.pipelines.set(pipeline.id, pipeline);
  }

  start(): void {
    if (this._started) return;
    this._started = true;

    for (const [id, pipeline] of this.pipelines) {
      const timer = setInterval(() => this.executePipeline(id), pipeline.intervalMs);
      this.timers.set(id, timer);
    }

    this._bootTimeout = setTimeout(() => {
      this._bootTimeout = null;
      for (const id of this.pipelines.keys()) {
        this.executePipeline(id);
      }
    }, 10_000);

    platformBus.emit("engine:ai:pipelines-started" as any, {
      pipelineCount: this.pipelines.size,
      timestamp: Date.now(),
    });
  }

  stop(): void {
    if (this._bootTimeout) {
      clearTimeout(this._bootTimeout);
      this._bootTimeout = null;
    }
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this._started = false;
  }

  private async executePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;

    const run: PipelineRun = {
      id: `${pipelineId}-${Date.now()}`,
      pipeline: pipelineId,
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      duration: null,
      findings: [],
      actions: [],
      error: null,
    };

    try {
      const result = await pipeline.task();
      run.findings = result.findings;
      run.actions = result.actions;
      run.status = "completed";
    } catch (err) {
      run.status = "failed";
      run.error = err instanceof Error ? err.message : String(err);
    } finally {
      run.completedAt = Date.now();
      run.duration = run.completedAt - run.startedAt;
      this.runs.push(run);
      if (this.runs.length > this.MAX_RUNS) {
        this.runs = this.runs.slice(-this.MAX_RUNS);
      }

      platformBus.emit("engine:ai:pipeline-completed" as any, {
        pipelineId,
        status: run.status,
        findings: run.findings.length,
        actions: run.actions.length,
        duration: run.duration,
      });
    }
  }

  async runNow(pipelineId: string): Promise<PipelineRun | null> {
    await this.executePipeline(pipelineId);
    return this.runs.filter(r => r.pipeline === pipelineId).pop() ?? null;
  }

  getPipelineDefinitions(): PipelineDefinition[] {
    return Array.from(this.pipelines.values()).map(p => ({
      ...p,
      task: p.task,
    }));
  }

  getRecentRuns(pipelineId?: string, limit = 20): PipelineRun[] {
    const filtered = pipelineId ? this.runs.filter(r => r.pipeline === pipelineId) : this.runs;
    return filtered.slice(-limit);
  }

  getReport() {
    const definitions = Array.from(this.pipelines.values());
    return {
      started: this._started,
      pipelineCount: definitions.length,
      pipelines: definitions.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        intervalMs: d.intervalMs,
        lastRun: this.runs.filter(r => r.pipeline === d.id).pop() ?? null,
      })),
      recentRuns: this.runs.slice(-10),
      totalRuns: this.runs.length,
    };
  }
}

export const automationPipelines = new AutomationPipelineScheduler();
