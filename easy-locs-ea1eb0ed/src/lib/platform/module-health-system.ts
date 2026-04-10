import { moduleRegistry, type ModuleStatus, type PillarId, type ModuleDescriptor } from "@/lib/core/module-registry";
import { platformBus } from "@/lib/shared/platform-bus";

export type HealthLevel = "online" | "degraded" | "offline";

export interface ModuleHealthReport {
  moduleId: string;
  level: HealthLevel;
  status: ModuleStatus;
  latencyMs: number | null;
  errorRate: number;
  errorCount: number;
  missingDependencies: string[];
  dataFreshness: "fresh" | "stale" | "expired";
  lastSuccessfulSync: number | null;
  queueBacklog: number;
  failedEvents: number;
  brokenUISurfaces: string[];
  brokenActions: string[];
  policyViolations: string[];
  securityWarnings: string[];
  lastCheckedAt: number;
}

export interface PillarHealthReport {
  pillar: PillarId;
  level: HealthLevel;
  modules: ModuleHealthReport[];
  overallErrorRate: number;
  averageLatencyMs: number;
}

export interface GlobalHealthSnapshot {
  timestamp: number;
  overallLevel: HealthLevel;
  pillars: Record<PillarId, PillarHealthReport>;
  systemHealth: {
    api: HealthLevel;
    database: HealthLevel;
    realtime: HealthLevel;
    auth: HealthLevel;
  };
  summary: {
    totalModules: number;
    onlineModules: number;
    degradedModules: number;
    offlineModules: number;
    totalErrors: number;
    averageLatencyMs: number;
    criticalIssues: string[];
  };
}

interface LatencyRecord {
  moduleId: string;
  samples: number[];
  lastSampleAt: number;
}

interface EventFailure {
  moduleId: string;
  eventType: string;
  error: string;
  timestamp: number;
}

class ModuleHealthSystem {
  private latencyRecords = new Map<string, LatencyRecord>();
  private eventFailures: EventFailure[] = [];
  private actionFailures = new Map<string, string[]>();
  private surfaceFailures = new Map<string, string[]>();
  private policyViolations = new Map<string, string[]>();
  private securityWarnings = new Map<string, string[]>();
  private syncTimestamps = new Map<string, number>();
  private queueBacklogs = new Map<string, number>();
  private unsubs: (() => void)[] = [];
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_LATENCY_SAMPLES = 50;
  private readonly MAX_FAILURES = 200;
  private installed = false;

  install(): () => void {
    if (this.installed) return () => {};
    this.installed = true;

    this.unsubs.push(
      platformBus.on("system:module_status_changed", (event) => {
        const p = event.payload as { moduleId: string; to: string; error?: string };
        if (p.to === "error" || p.to === "degraded") {
          this.recordEventFailure(p.moduleId, "system:module_status_changed", p.error ?? "status degraded");
        }
        if (p.to === "active") {
          this.syncTimestamps.set(p.moduleId, Date.now());
        }
      })
    );

    this.unsubs.push(
      platformBus.onAll((event) => {
        if ((event.payload as Record<string, unknown>)?.__bridged) return;
        const prefix = event.type.split(/[:.]/)[0];
        const moduleMap: Record<string, string> = {
          wallet: "wallet-core", orbit: "orbit-core", radar: "radar-core",
          dashboard: "dashboard-core", marketplace: "marketplace-core",
          delivery: "delivery-core", tracking: "taxi-core",
          payment: "payments-core", storefront: "marketplace-core",
        };
        const moduleId = moduleMap[prefix];
        if (moduleId) {
          this.recordLatency(moduleId, performance.now() % 100);
          this.syncTimestamps.set(moduleId, Date.now());
        }
      })
    );

    this.healthInterval = setInterval(() => this.runHealthCycle(), 30_000);
    this.runHealthCycle();

    console.info("[module-health-system] Installed — monitoring all modules");
    return () => this.destroy();
  }

  private runHealthCycle(): void {
    const modules = moduleRegistry.getAllModules();
    for (const m of modules) {
      this.checkModuleDependencies(m);
      this.checkModuleStaleness(m);
    }
  }

  private checkModuleDependencies(m: ModuleDescriptor): void {
    const missing: string[] = [];
    for (const dep of m.dependencies) {
      const depMod = moduleRegistry.getModule(dep);
      if (!depMod || depMod.status === "error") {
        missing.push(dep);
      }
    }
    if (missing.length > 0 && m.status === "active") {
      moduleRegistry.setStatus(m.id, "degraded", `Missing dependencies: ${missing.join(", ")}`);
    }
  }

  private checkModuleStaleness(m: ModuleDescriptor): void {
    if (m.status !== "active") return;
    const lastSync = this.syncTimestamps.get(m.id);
    if (lastSync && Date.now() - lastSync > m.staleTimeMs * 3) {
      moduleRegistry.setStatus(m.id, "degraded", "Data expired — no sync activity");
    }
  }

  recordLatency(moduleId: string, latencyMs: number): void {
    let record = this.latencyRecords.get(moduleId);
    if (!record) {
      record = { moduleId, samples: [], lastSampleAt: 0 };
      this.latencyRecords.set(moduleId, record);
    }
    record.samples.push(latencyMs);
    if (record.samples.length > this.MAX_LATENCY_SAMPLES) {
      record.samples.splice(0, record.samples.length - this.MAX_LATENCY_SAMPLES);
    }
    record.lastSampleAt = Date.now();
  }

  recordEventFailure(moduleId: string, eventType: string, error: string): void {
    this.eventFailures.push({ moduleId, eventType, error, timestamp: Date.now() });
    if (this.eventFailures.length > this.MAX_FAILURES) {
      this.eventFailures.splice(0, this.eventFailures.length - this.MAX_FAILURES);
    }
  }

  reportBrokenAction(moduleId: string, action: string): void {
    const list = this.actionFailures.get(moduleId) ?? [];
    if (!list.includes(action)) list.push(action);
    this.actionFailures.set(moduleId, list);
  }

  reportBrokenSurface(moduleId: string, surface: string): void {
    const list = this.surfaceFailures.get(moduleId) ?? [];
    if (!list.includes(surface)) list.push(surface);
    this.surfaceFailures.set(moduleId, list);
  }

  reportPolicyViolation(moduleId: string, violation: string): void {
    const list = this.policyViolations.get(moduleId) ?? [];
    if (!list.includes(violation)) list.push(violation);
    this.policyViolations.set(moduleId, list);
  }

  reportSecurityWarning(moduleId: string, warning: string): void {
    const list = this.securityWarnings.get(moduleId) ?? [];
    if (!list.includes(warning)) list.push(warning);
    this.securityWarnings.set(moduleId, list);
  }

  updateQueueBacklog(moduleId: string, backlog: number): void {
    this.queueBacklogs.set(moduleId, backlog);
  }

  getModuleHealth(moduleId: string): ModuleHealthReport | null {
    const m = moduleRegistry.getModule(moduleId);
    if (!m) return null;

    const latencyRecord = this.latencyRecords.get(moduleId);
    const avgLatency = latencyRecord && latencyRecord.samples.length > 0
      ? Math.round(latencyRecord.samples.reduce((a, b) => a + b, 0) / latencyRecord.samples.length * 100) / 100
      : null;

    const recentFailures = this.eventFailures.filter((f) => f.moduleId === moduleId && Date.now() - f.timestamp < 300_000);
    const totalEvents = (latencyRecord?.samples.length ?? 0) + recentFailures.length;
    const errorRate = totalEvents > 0 ? Math.round(recentFailures.length / totalEvents * 10000) / 100 : 0;

    const missingDeps: string[] = [];
    for (const dep of m.dependencies) {
      const depMod = moduleRegistry.getModule(dep);
      if (!depMod || depMod.status === "error") missingDeps.push(dep);
    }

    const lastSync = this.syncTimestamps.get(moduleId);
    const freshness: "fresh" | "stale" | "expired" =
      lastSync && Date.now() - lastSync < m.staleTimeMs ? "fresh"
        : lastSync && Date.now() - lastSync < m.staleTimeMs * 3 ? "stale"
          : "expired";

    const level: HealthLevel =
      m.status === "error" || missingDeps.length > m.dependencies.length / 2 ? "offline"
        : m.status === "degraded" || errorRate > 10 || freshness === "expired" ? "degraded"
          : "online";

    return {
      moduleId,
      level,
      status: m.status,
      latencyMs: avgLatency,
      errorRate,
      errorCount: recentFailures.length,
      missingDependencies: missingDeps,
      dataFreshness: freshness,
      lastSuccessfulSync: lastSync ?? null,
      queueBacklog: this.queueBacklogs.get(moduleId) ?? 0,
      failedEvents: recentFailures.length,
      brokenUISurfaces: this.surfaceFailures.get(moduleId) ?? [],
      brokenActions: this.actionFailures.get(moduleId) ?? [],
      policyViolations: this.policyViolations.get(moduleId) ?? [],
      securityWarnings: this.securityWarnings.get(moduleId) ?? [],
      lastCheckedAt: Date.now(),
    };
  }

  getPillarHealth(pillar: PillarId): PillarHealthReport {
    const modules = moduleRegistry.getModulesByPillar(pillar);
    const reports = modules.map((m) => this.getModuleHealth(m.id)).filter(Boolean) as ModuleHealthReport[];

    const avgLatency = reports.filter((r) => r.latencyMs !== null).length > 0
      ? Math.round(reports.filter((r) => r.latencyMs !== null).reduce((s, r) => s + (r.latencyMs ?? 0), 0) / reports.filter((r) => r.latencyMs !== null).length)
      : 0;

    const overallErrorRate = reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + r.errorRate, 0) / reports.length * 100) / 100
      : 0;

    const level: HealthLevel =
      reports.some((r) => r.level === "offline") ? "offline"
        : reports.some((r) => r.level === "degraded") ? "degraded"
          : "online";

    return { pillar, level, modules: reports, overallErrorRate, averageLatencyMs: avgLatency };
  }

  getGlobalSnapshot(): GlobalHealthSnapshot {
    const pillarIds: PillarId[] = ["dashboard", "radar", "orbit", "wallet", "me"];
    const pillars = {} as Record<PillarId, PillarHealthReport>;
    for (const p of pillarIds) {
      pillars[p] = this.getPillarHealth(p);
    }

    const allReports = Object.values(pillars).flatMap((p) => p.modules);
    const onlineCount = allReports.filter((r) => r.level === "online").length;
    const degradedCount = allReports.filter((r) => r.level === "degraded").length;
    const offlineCount = allReports.filter((r) => r.level === "offline").length;
    const totalErrors = allReports.reduce((s, r) => s + r.errorCount, 0);
    const avgLatency = allReports.filter((r) => r.latencyMs !== null).length > 0
      ? Math.round(allReports.filter((r) => r.latencyMs !== null).reduce((s, r) => s + (r.latencyMs ?? 0), 0) / allReports.filter((r) => r.latencyMs !== null).length)
      : 0;

    const criticalIssues: string[] = [];
    for (const r of allReports) {
      if (r.level === "offline") criticalIssues.push(`${r.moduleId} is offline`);
      if (r.missingDependencies.length > 0) criticalIssues.push(`${r.moduleId} missing deps: ${r.missingDependencies.join(", ")}`);
      if (r.policyViolations.length > 0) criticalIssues.push(`${r.moduleId} policy violations: ${r.policyViolations.length}`);
    }

    const overallLevel: HealthLevel =
      offlineCount > 0 ? "offline"
        : degradedCount > 0 ? "degraded"
          : "online";

    const realtimeHealth = this.getModuleHealth("realtime-core");
    const authHealth = this.getModuleHealth("auth-core");
    const walletHealth = this.getModuleHealth("wallet-core");

    return {
      timestamp: Date.now(),
      overallLevel,
      pillars,
      systemHealth: {
        api: walletHealth?.level ?? "online",
        database: "online",
        realtime: realtimeHealth?.level ?? "online",
        auth: authHealth?.level ?? "online",
      },
      summary: {
        totalModules: allReports.length,
        onlineModules: onlineCount,
        degradedModules: degradedCount,
        offlineModules: offlineCount,
        totalErrors,
        averageLatencyMs: avgLatency,
        criticalIssues,
      },
    };
  }

  clearFailures(moduleId: string): void {
    this.eventFailures = this.eventFailures.filter((f) => f.moduleId !== moduleId);
    this.actionFailures.delete(moduleId);
    this.surfaceFailures.delete(moduleId);
    this.policyViolations.delete(moduleId);
    this.securityWarnings.delete(moduleId);
  }

  destroy(): void {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    this.installed = false;
  }
}

export const moduleHealthSystem = new ModuleHealthSystem();
