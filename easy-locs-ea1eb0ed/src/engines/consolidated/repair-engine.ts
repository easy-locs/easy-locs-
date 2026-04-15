import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { db as supabase } from "@/services/db";
import { adaptiveRetry } from "@/lib/infrastructure/adaptive-retry";

const STALE_THRESHOLD_MS = 60_000;
const STALE_REFETCH_COOLDOWN_MS = 30_000;
const OFFLINE_COOLDOWN_MS = 15_000;
const MEMORY_COOLDOWN_MS = 60_000;
const SYNC_REPAIR_COOLDOWN_MS = 5_000;
const SYNC_REPAIR_MAX_RETRIES = 5;

export class RepairEngine extends BaseEngine {
  private cooldowns: Map<string, number> = new Map();
  private consecutiveSyncRepairs = 0;
  private lastSyncRepairTime = 0;
  private lastConversationCount = 0;
  private consecutiveDupCycles = 0;

  constructor() {
    super({
      id: "repair-engine",
      name: "Repair Engine",
      category: "repair",
      domain: "platform",
      intervalMs: 15_000,
    });
  }

  private canRun(fixType: string, cooldownMs: number): boolean {
    const last = this.cooldowns.get(fixType) || 0;
    return Date.now() - last > cooldownMs;
  }

  private recordCooldown(fixType: string): void {
    this.cooldowns.set(fixType, Date.now());
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    await this.tickStaleQueryRefetch(findings, actions);
    this.tickOfflineRecovery(findings, actions);
    this.tickMemoryPressure(findings, actions);
    await this.tickSyncRepair(findings, actions);
    this.tickConversationConsistency(findings, actions);
    await this.tickRuntimeRepair(findings, actions);
    await this.tickStaleCacheScan(findings, actions);
    await this.tickRealtimeHealth(findings);
    await this.tickBackendConnectivity(findings, actions);
    await this.tickFullStackLinkage(findings, actions);

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }

  private async tickStaleQueryRefetch(findings: string[], actions: string[]): Promise<void> {
    if (!this.canRun("stale-query-refetch", STALE_REFETCH_COOLDOWN_MS)) return;
    try {
      const timeSinceLoad = performance.now();
      if (timeSinceLoad > STALE_THRESHOLD_MS && navigator.onLine && !document.hidden) {
        const lastRefetch = Number(sessionStorage.getItem("el-last-stale-refetch") || "0");
        if (Date.now() - lastRefetch > STALE_REFETCH_COOLDOWN_MS) {
          platformBus.emit("system:stale_queries_detected", {
            timestamp: Date.now(), timeSinceLoad: Math.round(timeSinceLoad), reason: "idle_threshold",
          }, "system");
          sessionStorage.setItem("el-last-stale-refetch", String(Date.now()));
          actions.push("Triggered stale query refetch after idle threshold");
          this.recordCooldown("stale-query-refetch");
        }
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }

  private tickOfflineRecovery(findings: string[], actions: string[]): void {
    if (!this.canRun("offline-recovery", OFFLINE_COOLDOWN_MS)) return;
    if (navigator.onLine) {
      const wasOffline = sessionStorage.getItem("el-was-offline");
      if (wasOffline) {
        sessionStorage.removeItem("el-was-offline");
        platformBus.emit("system:online_recovered", { timestamp: Date.now() }, "system");
        actions.push("Online recovery triggered");
        this.recordCooldown("offline-recovery");
      }
    } else {
      sessionStorage.setItem("el-was-offline", "1");
      findings.push("Device currently offline");
    }
  }

  private tickMemoryPressure(findings: string[], actions: string[]): void {
    if (!this.canRun("memory-pressure", MEMORY_COOLDOWN_MS)) return;
    interface PerformanceMemory { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number }
    const perfWithMemory = performance as Performance & { memory?: PerformanceMemory };
    const mem = perfWithMemory.memory;
    if (mem && mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.85) {
      findings.push("Memory pressure detected (>85%)");
      platformBus.emit("system:memory_pressure", {
        timestamp: Date.now(), usedBytes: mem.usedJSHeapSize, limitBytes: mem.jsHeapSizeLimit,
        ratio: mem.usedJSHeapSize / mem.jsHeapSizeLimit,
      }, "system");
      this.recordCooldown("memory-pressure");
    }
  }

  private async tickSyncRepair(findings: string[], actions: string[]): Promise<void> {
    if (document.hidden) return;
    const lastSync = Number(sessionStorage.getItem("el-last-sync-ts") || "0");
    const gap = Date.now() - lastSync;

    if (lastSync > 0 && gap > 120_000) {
      findings.push(`Sync gap: ${Math.round(gap / 1000)}s since last sync`);
      if (gap > 300_000 && navigator.onLine) {
        const now = Date.now();
        if (now - this.lastSyncRepairTime < SYNC_REPAIR_COOLDOWN_MS) return;
        if (this.consecutiveSyncRepairs >= SYNC_REPAIR_MAX_RETRIES) {
          findings.push(`Max sync repair retries reached (${SYNC_REPAIR_MAX_RETRIES})`);
          return;
        }
        this.consecutiveSyncRepairs++;
        this.lastSyncRepairTime = now;
        try {
          const channels = supabase.getChannels();
          const staleChannels = channels.filter(ch => {
            const channelState = (ch as unknown as { state: string }).state;
            return channelState === "errored" || channelState === "closed" || channelState === "timed_out";
          });
          if (staleChannels.length > 0) {
            for (const ch of staleChannels) {
              try { supabase.removeChannel(ch); } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
            }
            actions.push(`Removed ${staleChannels.length} stale channel(s)`);
          }
          await adaptiveRetry.executeWithRetry(
            `sync-repair:${this.consecutiveSyncRepairs}`,
            async () => {
              platformBus.emit("system:sync_requested", { reason: "gap", gap, timestamp: now, attempt: this.consecutiveSyncRepairs }, "system");
            },
            { maxRetries: 2, baseDelayMs: 300 },
          );
          actions.push(`Triggered sync repair — attempt ${this.consecutiveSyncRepairs}/${SYNC_REPAIR_MAX_RETRIES}`);
        } catch {
          actions.push(`Sync repair attempt ${this.consecutiveSyncRepairs} failed (with adaptive retry)`);
        }
      }
    } else if (lastSync > 0 && gap <= 120_000) {
      this.consecutiveSyncRepairs = 0;
    }
  }

  private tickConversationConsistency(findings: string[], actions: string[]): void {
    const convItems = document.querySelectorAll("[data-conversation-id]");
    const ids = new Set<string>();
    convItems.forEach(el => {
      const id = el.getAttribute("data-conversation-id");
      if (id) ids.add(id);
    });

    if (this.lastConversationCount > 0 && ids.size === 0 && !document.hidden) {
      findings.push("Conversation list dropped to 0 — possible render failure");
    }

    const duplicateCheck = new Map<string, number>();
    convItems.forEach(el => {
      const id = el.getAttribute("data-conversation-id") || "";
      duplicateCheck.set(id, (duplicateCheck.get(id) || 0) + 1);
    });

    const duplicateIds: string[] = [];
    for (const [id, count] of duplicateCheck) {
      if (count > 1) {
        findings.push(`Duplicate conversation rendered: ${id} (${count}x)`);
        duplicateIds.push(id);
      }
    }

    if (duplicateIds.length > 0) {
      this.consecutiveDupCycles++;
      platformBus.emit("orbit:thread_updated", { reason: "duplicate_detected", duplicateIds, timestamp: Date.now() }, "orbit");
      actions.push(`Emitted dedup signal for ${duplicateIds.length} duplicate conversation(s)`);
      if (this.consecutiveDupCycles >= 3) {
        platformBus.emit("orbit:force_reload", { reason: "persistent_duplicates", duplicateIds, cycles: this.consecutiveDupCycles, timestamp: Date.now() }, "orbit");
        actions.push(`Forced full thread reload after ${this.consecutiveDupCycles} consecutive duplicate cycles`);
        this.consecutiveDupCycles = 0;
      }
    } else {
      this.consecutiveDupCycles = 0;
    }

    this.lastConversationCount = ids.size;
  }

  private async tickRuntimeRepair(findings: string[], actions: string[]): Promise<void> {
    if (!this.canRun("runtime-repair-cycle", 12_000)) return;
    try {
      const { runAutoRepairCycle } = await import("@/lib/runtime/auto-repair-engine");
      const repairActions = await runAutoRepairCycle();
      for (const a of repairActions) {
        if (a.result === "fixed") actions.push(`[repair] ${a.module}: ${a.action}`);
        else if (a.result === "failed") findings.push(`[repair-fail] ${a.module}: ${a.action}`);
        else findings.push(`[repair-skip] ${a.module}: ${a.action}`);
      }
      this.recordCooldown("runtime-repair-cycle");
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickStaleCacheScan(findings: string[], actions: string[]): Promise<void> {
    if (!this.canRun("stale-cache-scan", 15_000)) return;
    try {
      const { scanForStaleCache } = await import("@/lib/runtime/stale-cache-detector");
      const report = scanForStaleCache();
      if (report.staleEntries > 0) {
        findings.push(`Stale cache: ${report.staleEntries} entries in domains [${report.staleDomains.join(", ")}]`);
        actions.push(`Stale cache scan found ${report.staleEntries} entry(ies)`);
      }
      this.recordCooldown("stale-cache-scan");
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickRealtimeHealth(findings: string[]): Promise<void> {
    if (!this.canRun("realtime-health-check", 10_000)) return;
    try {
      const [{ checkStaleness }, { reportHealth }] = await Promise.all([
        import("@/lib/runtime/realtime-monitor"),
        import("@/lib/runtime/health-aggregator"),
      ]);
      const stale = checkStaleness();
      if (stale.length > 0) {
        findings.push(`Realtime: ${stale.length} stale channel(s)`);
        reportHealth("realtime", "degraded", undefined, `${stale.length} stale channels`);
      } else {
        reportHealth("realtime", "ok");
      }
      this.recordCooldown("realtime-health-check");
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickBackendConnectivity(findings: string[], actions: string[]): Promise<void> {
    if (!this.canRun("backend-connectivity", 45_000)) return;
    try {
      const { runBackendConnectivityCheck } = await import("@/lib/engines/backend-connectivity-engine");
      const result = await adaptiveRetry.executeWithRetry(
        "backend-connectivity-check",
        () => runBackendConnectivityCheck(5000),
        { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000 },
      );
      if (result.down > 0) actions.push(`${result.down} service(s) DOWN`);
      if (result.degraded > 0) actions.push(`${result.degraded} service(s) degraded`);
      this.recordCooldown("backend-connectivity");
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickFullStackLinkage(findings: string[], actions: string[]): Promise<void> {
    if (!this.canRun("full-stack-linkage", 120_000)) return;
    try {
      const { runFullStackLinkageCheck } = await import("@/lib/engines/full-stack-linkage-engine");
      const result = await runFullStackLinkageCheck(100);
      if (result.broken > 0) actions.push(`${result.broken} broken linkages`);
      if (result.missing > 0) actions.push(`${result.missing} missing linkages`);
      this.recordCooldown("full-stack-linkage");
    } catch (err) { if (import.meta.env.DEV) console.warn('[repair] sub-module error', err instanceof Error ? err.message : err); }
  }
}
