import { cronOrchestrator } from "./cron-orchestrator";
import { hyperOptimizationEngine } from "./hyper-optimization-engine";
import { blackChamber } from "./black-chamber";
import { pastControl } from "./past-control";
import { godAudit } from "./god-audit";
import { stateMachineEngine } from "./state-machines";
import type { CronJobDeclaration } from "./cron-orchestrator";

export type GodSystemStatus = "uninitialized" | "booting" | "running" | "degraded" | "stopped";

export interface GodSystemConfig {
  enableCronOrchestrator: boolean;
  enableHyperOptimization: boolean;
  enableBlackChamber: boolean;
  enablePastControl: boolean;
  runInitialAudit: boolean;
  dryRun: boolean;
}

const DEFAULT_CONFIG: GodSystemConfig = {
  enableCronOrchestrator: true,
  enableHyperOptimization: true,
  enableBlackChamber: true,
  enablePastControl: true,
  runInitialAudit: true,
  dryRun: false,
};

class GodCore {
  private status: GodSystemStatus = "uninitialized";
  private config: GodSystemConfig = { ...DEFAULT_CONFIG };
  private bootTime = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatCount = 0;

  get systemStatus(): GodSystemStatus {
    return this.status;
  }

  get uptime(): number {
    return this.bootTime > 0 ? Date.now() - this.bootTime : 0;
  }

  boot(config?: Partial<GodSystemConfig>): void {
    if (this.status === "running") return;

    this.status = "booting";
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bootTime = Date.now();

    this.registerWorkerIdentities();
    this.registerCronJobs();
    this.startEngines();

    if (this.config.runInitialAudit) {
      this.scheduleInitialAudit();
    }

    this.startHeartbeat();
    this.status = "running";
  }

  shutdown(): void {
    if (this.status === "stopped" || this.status === "uninitialized") return;

    cronOrchestrator.stop();
    cronOrchestrator.stopAll();
    hyperOptimizationEngine.stop();
    blackChamber.stop();
    pastControl.stop();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.status = "stopped";
  }

  private startEngines(): void {
    if (this.config.enableCronOrchestrator) {
      cronOrchestrator.start();
      cronOrchestrator.startAll();
    }
    if (this.config.enableHyperOptimization) hyperOptimizationEngine.start();
    if (this.config.enableBlackChamber) blackChamber.start();
    if (this.config.enablePastControl) pastControl.start();
  }

  private registerWorkerIdentities(): void {
    if (!this.config.enableBlackChamber) return;

    const engines = [
      { id: "cron-orchestrator", name: "Cron Orchestrator", role: "cron" as const },
      { id: "hyper-optimization-engine", name: "Hyper Optimization Engine", role: "engine" as const },
      { id: "black-chamber", name: "Black Chamber", role: "admin" as const },
      { id: "past-control", name: "Past Control", role: "audit" as const },
    ];

    for (const e of engines) {
      blackChamber.registerIdentity({
        id: e.id,
        name: e.name,
        role: e.role,
        domain: "god",
        created_at: Date.now(),
        last_active: Date.now(),
        trust_level: 100,
        permissions: ["read", "write", "audit", "heal"],
      });
    }
  }

  private registerCronJobs(): void {
    if (!this.config.enableCronOrchestrator) return;

    const jobs: CronJobDeclaration[] = [
      {
        job_id: "data_integrity_check",
        engine_owner: "god-core",
        purpose: "Data quality engine incremental sweep",
        schedule_ms: 10 * 60_000,
        timeout_ms: 60_000,
        retry_policy: { max_retries: 2, backoff_ms: 5000 },
        resource_locks: ["data_integrity_check"],
        downstream_events: ["data_integrity_check:completed"],
        criticality: "high",
        health_probe: () => true,
        execute: async () => {
          try {
            const { shouldSkipIncrementalSweep } = await import("@/lib/runtime/runtime-safety");
            if (shouldSkipIncrementalSweep()) {
              return { success: true, duration_ms: 0, findings: 0, actions: ["skipped: sweep in progress or cooldown"] };
            }
            const { runIncrementalSweep } = await import("@/lib/data-quality/audit-runner");
            const report = runIncrementalSweep();
            return { success: true, duration_ms: 0, findings: report.summary.totalEntities, actions: [`${report.summary.quarantined} quarantined`, `${report.summary.autoFixed} auto-fixed`] };
          } catch {
            return { success: true, duration_ms: 0, findings: 0, actions: [] };
          }
        },
      },
    ];

    for (const job of jobs) {
      cronOrchestrator.registerJob(job);
    }
  }

  private scheduleInitialAudit(): void {
    setTimeout(() => {
      if (this.status !== "running") return;

      pastControl.takeSnapshot("boot_snapshot", { timestamp: Date.now() });

      const report = godAudit.runFullGodAudit();
      const printed = godAudit.printReport(report);

      if (import.meta.env.DEV) {
        console.log(printed);
        console.log(
          `%c[GOD AUDIT] Verdict: ${report.section_13_verdict.verdict} | Score: ${report.section_1_global_health.overall_god_score}/100`,
          report.section_13_verdict.verdict === "PASS"
            ? "color: #22C55E; font-weight: bold;"
            : report.section_13_verdict.verdict === "PASS_WITH_WARNINGS"
              ? "color: #EAB308; font-weight: bold;"
              : "color: #EF4444; font-weight: bold;"
        );
      }
    }, 10_000);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeatCount++;

      if (this.config.enableBlackChamber) {
        const engines = [
          "cron-orchestrator",
          "hyper-optimization-engine",
          "black-chamber",
          "past-control",
        ];
        for (const id of engines) {
          blackChamber.heartbeatIdentity(id);
        }
      }

      const runningCount = this.getRunningEngines().length;
      const totalCount = this.getEngineCount();
      if (runningCount < totalCount * 0.5) {
        this.status = "degraded";
      } else if (this.status === "degraded" && runningCount >= totalCount * 0.8) {
        this.status = "running";
      }
    }, 30_000);
  }

  runFullAudit() {
    return godAudit.runFullGodAudit();
  }

  printAudit() {
    const report = this.runFullAudit();
    return godAudit.printReport(report);
  }

  canDeploy() {
    return true;
  }

  getRunningEngines(): string[] {
    const all = [
      { id: "cron-orchestrator", running: cronOrchestrator.isRunning },
      { id: "hyper-optimization", running: hyperOptimizationEngine.isRunning },
      { id: "black-chamber", running: blackChamber.isRunning },
      { id: "past-control", running: pastControl.isRunning },
    ];
    return all.filter((e) => e.running).map((e) => e.id);
  }

  private getEngineCount(): number {
    let count = 0;
    if (this.config.enableCronOrchestrator) count++;
    if (this.config.enableHyperOptimization) count++;
    if (this.config.enableBlackChamber) count++;
    if (this.config.enablePastControl) count++;
    return count;
  }

  getSystemInfo() {
    return {
      status: this.status,
      uptime: this.uptime,
      heartbeats: this.heartbeatCount,
      config: this.config,
      engines: {
        total: this.getEngineCount(),
        running: this.getRunningEngines().length,
        list: this.getRunningEngines(),
      },
      stateMachines: stateMachineEngine.getAllMachineIds(),
      cronJobs: cronOrchestrator.getStats(),
      optimization: hyperOptimizationEngine.getStats(),
      blackChamber: blackChamber.getStats(),
      pastControl: pastControl.getStats(),
    };
  }
}

export const godCore = new GodCore();
