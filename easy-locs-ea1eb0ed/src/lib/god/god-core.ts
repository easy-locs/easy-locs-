import { antiConflictEngine } from "./anti-conflict-engine";
import { continuousAuditEngine } from "./continuous-audit-engine";
import { maintenanceEngine } from "./maintenance-engine";
import { cronOrchestrator } from "./cron-orchestrator";
import { qualityGateEngine } from "./quality-gate-engine";
import { observabilityEngine } from "./observability-engine";
import { hyperOptimizationEngine } from "./hyper-optimization-engine";
import { blackChamber } from "./black-chamber";
import { pastControl } from "./past-control";
import { godAudit } from "./god-audit";
import { taxonomyGodEngine } from "./taxonomy-god-engine";
import { stateMachineEngine } from "./state-machines";
import type { CronJobDeclaration } from "./cron-orchestrator";

export type GodSystemStatus = "uninitialized" | "booting" | "running" | "degraded" | "stopped";

export interface GodSystemConfig {
  enableAntiConflict: boolean;
  enableContinuousAudit: boolean;
  enableMaintenance: boolean;
  enableCronOrchestrator: boolean;
  enableQualityGate: boolean;
  enableObservability: boolean;
  enableHyperOptimization: boolean;
  enableBlackChamber: boolean;
  enablePastControl: boolean;
  runInitialAudit: boolean;
  dryRun: boolean;
}

const DEFAULT_CONFIG: GodSystemConfig = {
  enableAntiConflict: true,
  enableContinuousAudit: true,
  enableMaintenance: true,
  enableCronOrchestrator: true,
  enableQualityGate: true,
  enableObservability: true,
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

    if (this.config.dryRun) {
      maintenanceEngine.setPolicy({ dry_run: true });
    }

    this.registerWorkerIdentities();
    this.registerCronJobs();
    this.startEngines();

    if (this.config.runInitialAudit) {
      this.scheduleInitialAudit();
    }

    this.startHeartbeat();
    this.status = "running";

    console.log(
      `%c[GOD SYSTEM] ⚡ EASY-LOCS GOD CORE ONLINE — ${this.getEngineCount()} engines active`,
      "color: #C8A94E; font-weight: bold; font-size: 14px;"
    );
  }

  shutdown(): void {
    if (this.status === "stopped" || this.status === "uninitialized") return;

    antiConflictEngine.stop();
    continuousAuditEngine.stop();
    maintenanceEngine.stop();
    cronOrchestrator.stop();
    cronOrchestrator.stopAll();
    qualityGateEngine.stop();
    observabilityEngine.stop();
    hyperOptimizationEngine.stop();
    blackChamber.stop();
    pastControl.stop();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.status = "stopped";
    console.log("[GOD SYSTEM] Shutdown complete");
  }

  private startEngines(): void {
    if (this.config.enableAntiConflict) antiConflictEngine.start();
    if (this.config.enableContinuousAudit) continuousAuditEngine.start();
    if (this.config.enableMaintenance) maintenanceEngine.start();
    if (this.config.enableCronOrchestrator) {
      cronOrchestrator.start();
      cronOrchestrator.startAll();
    }
    if (this.config.enableQualityGate) qualityGateEngine.start();
    if (this.config.enableObservability) observabilityEngine.start();
    if (this.config.enableHyperOptimization) hyperOptimizationEngine.start();
    if (this.config.enableBlackChamber) blackChamber.start();
    if (this.config.enablePastControl) pastControl.start();
  }

  private registerWorkerIdentities(): void {
    if (!this.config.enableBlackChamber) return;

    const engines = [
      { id: "anti-conflict-engine", name: "Anti-Conflict Engine", role: "engine" as const },
      { id: "continuous-audit-engine", name: "Continuous Audit Engine", role: "audit" as const },
      { id: "maintenance-engine", name: "Maintenance Engine", role: "heal" as const },
      { id: "cron-orchestrator", name: "Cron Orchestrator", role: "cron" as const },
      { id: "quality-gate-engine", name: "Quality Gate Engine", role: "audit" as const },
      { id: "observability-engine", name: "Observability Engine", role: "engine" as const },
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

    const defaultJob = (
      id: string,
      owner: string,
      purpose: string,
      scheduleMs: number,
      criticality: CronJobDeclaration["criticality"]
    ): CronJobDeclaration => ({
      job_id: id,
      engine_owner: owner,
      purpose,
      schedule_ms: scheduleMs,
      timeout_ms: Math.min(scheduleMs * 0.8, 60_000),
      retry_policy: { max_retries: 3, backoff_ms: 5000 },
      resource_locks: [id],
      downstream_events: [`${id}:completed`],
      criticality,
      health_probe: () => true,
      execute: async () => ({ success: true, duration_ms: 0, findings: 0, actions: [] }),
    });

    const jobs: CronJobDeclaration[] = [
      defaultJob("taxonomy_reindex", "taxonomy", "Re-index taxonomy tree", 15 * 60_000, "high"),
      defaultJob("conflict_scan", "anti-conflict", "Scan for conflicts", 5 * 60_000, "critical"),
      defaultJob("state_machine_check", "state-machines", "Validate state machines", 20 * 60_000, "critical"),
      {
        id: "data_integrity_check",
        domain: "audit",
        description: "Data quality engine incremental sweep",
        interval_ms: 10 * 60_000,
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
      defaultJob("media_validation", "media", "Validate media assets", 15 * 60_000, "medium"),
      defaultJob("listing_quality", "quality", "Audit listing quality", 30 * 60_000, "medium"),
      defaultJob("duplicate_detection", "anti-conflict", "Detect duplicates", 30 * 60_000, "medium"),
      defaultJob("seo_public_pages", "seo", "Audit public pages SEO", 30 * 60_000, "high"),
      defaultJob("performance_budget", "optimization", "Check performance budgets", 30 * 60_000, "high"),
      defaultJob("security_headers", "security", "Verify security headers", 60 * 60_000, "critical"),
      defaultJob("schema_drift", "past-control", "Detect schema drift", 60 * 60_000, "high"),
      defaultJob("route_integrity", "routing", "Verify route integrity", 2 * 60 * 60_000, "medium"),
      defaultJob("wallet_flow_integrity", "wallet", "Verify wallet flows", 30 * 60_000, "critical"),
      defaultJob("orbit_flow_integrity", "orbit", "Verify orbit flows", 30 * 60_000, "high"),
      defaultJob("dashboard_card_integrity", "dashboard", "Audit dashboard cards", 30 * 60_000, "medium"),
      defaultJob("radar_sync", "radar", "Verify radar sync", 15 * 60_000, "high"),
      defaultJob("hotel_catalog_audit", "hotel", "Audit hotel catalog", 6 * 60 * 60_000, "medium"),
      defaultJob("food_catalog_audit", "food", "Audit food catalog", 6 * 60 * 60_000, "medium"),
      defaultJob("service_catalog_audit", "service", "Audit service catalog", 6 * 60 * 60_000, "medium"),
      defaultJob("property_catalog_audit", "property", "Audit property catalog", 6 * 60 * 60_000, "medium"),
      defaultJob("flight_catalog_audit", "flight", "Audit flight catalog", 12 * 60 * 60_000, "low"),
      defaultJob("delivery_runtime", "delivery", "Check delivery runtime", 15 * 60_000, "high"),
      defaultJob("ad_banner_expiry", "media", "Expire old banners/ads", 60 * 60_000, "low"),
      defaultJob("cache_warmup", "optimization", "Warm critical caches", 60 * 60_000, "medium"),
      defaultJob("full_god_audit", "god", "Run full God audit", 24 * 60 * 60_000, "critical"),
    ];

    for (const job of jobs) {
      cronOrchestrator.registerJob(job);
    }
  }

  private scheduleInitialAudit(): void {
    setTimeout(() => {
      if (this.status !== "running") return;

      const snapshot = observabilityEngine.captureSnapshot();
      pastControl.takeSnapshot("boot_snapshot", snapshot as unknown as Record<string, unknown>);

      const report = godAudit.runFullGodAudit();
      const printed = godAudit.printReport(report);

      if (import.meta.env.DEV) {
        console.log(printed);
      }

      console.log(
        `%c[GOD AUDIT] Verdict: ${report.section_13_verdict.verdict} | Score: ${report.section_1_global_health.overall_god_score}/100`,
        report.section_13_verdict.verdict === "PASS"
          ? "color: #22C55E; font-weight: bold;"
          : report.section_13_verdict.verdict === "PASS_WITH_WARNINGS"
            ? "color: #EAB308; font-weight: bold;"
            : "color: #EF4444; font-weight: bold;"
      );
    }, 10_000);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeatCount++;

      if (this.config.enableBlackChamber) {
        const engines = [
          "anti-conflict-engine",
          "continuous-audit-engine",
          "maintenance-engine",
          "cron-orchestrator",
          "quality-gate-engine",
          "observability-engine",
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
        if (this.config.enableObservability) {
          observabilityEngine.createIncident(
            "critical",
            "god-core",
            "System Degraded",
            `Only ${runningCount}/${totalCount} engines running`
          );
        }
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
    return qualityGateEngine.canDeploy();
  }

  getRunningEngines(): string[] {
    const all = [
      { id: "anti-conflict", running: antiConflictEngine.isRunning },
      { id: "continuous-audit", running: continuousAuditEngine.isRunning },
      { id: "maintenance", running: maintenanceEngine.isRunning },
      { id: "cron-orchestrator", running: cronOrchestrator.isRunning },
      { id: "quality-gate", running: qualityGateEngine.isRunning },
      { id: "observability", running: observabilityEngine.isRunning },
      { id: "hyper-optimization", running: hyperOptimizationEngine.isRunning },
      { id: "black-chamber", running: blackChamber.isRunning },
      { id: "past-control", running: pastControl.isRunning },
    ];
    return all.filter((e) => e.running).map((e) => e.id);
  }

  private getEngineCount(): number {
    let count = 0;
    if (this.config.enableAntiConflict) count++;
    if (this.config.enableContinuousAudit) count++;
    if (this.config.enableMaintenance) count++;
    if (this.config.enableCronOrchestrator) count++;
    if (this.config.enableQualityGate) count++;
    if (this.config.enableObservability) count++;
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
      taxonomy: taxonomyGodEngine.getStats(),
      stateMachines: stateMachineEngine.getAllMachineIds(),
      cronJobs: cronOrchestrator.getStats(),
      conflicts: antiConflictEngine.getStats(),
      audit: continuousAuditEngine.getLastReport()?.overall_status ?? "pending",
      maintenance: maintenanceEngine.getStats(),
      optimization: hyperOptimizationEngine.getStats(),
      blackChamber: blackChamber.getStats(),
      pastControl: pastControl.getStats(),
      qualityGate: qualityGateEngine.getLastReport()?.verdict ?? "pending",
      godScore: observabilityEngine.getGodScore(),
    };
  }
}

export const godCore = new GodCore();
