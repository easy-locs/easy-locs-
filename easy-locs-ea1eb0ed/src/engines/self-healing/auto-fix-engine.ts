import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

interface FixAction {
  type: string;
  description: string;
  result: "success" | "failed" | "skipped";
  timestamp: number;
}

const STALE_THRESHOLD_MS = 300_000;
const STALE_REFETCH_COOLDOWN_MS = 120_000;
const OFFLINE_COOLDOWN_MS = 60_000;
const MEMORY_COOLDOWN_MS = 300_000;
const SYNC_REPAIR_COOLDOWN_MS = 10_000;
const SYNC_REPAIR_MAX_RETRIES = 3;

export class AutoFixEngine extends BaseEngine {
  private fixHistory: FixAction[] = [];
  private cooldowns: Map<string, number> = new Map();

  private _tickCount_local = 0;

  private consecutiveSyncRepairs = 0;
  private lastSyncRepairTime = 0;

  private lastConversationCount = 0;
  private consecutiveDupCycles = 0;

  constructor() {
    super({
      id: "sh-auto-fix",
      name: "Auto Fix Engine",
      category: "self-healing",
      intervalMs: 60_000,
    });
  }

  private canRun(fixType: string, cooldownMs: number): boolean {
    const last = this.cooldowns.get(fixType) || 0;
    return Date.now() - last > cooldownMs;
  }

  private recordFix(type: string, description: string, result: "success" | "failed" | "skipped"): void {
    this.fixHistory.push({ type, description, result, timestamp: Date.now() });
    this.cooldowns.set(type, Date.now());
    if (this.fixHistory.length > 200) this.fixHistory = this.fixHistory.slice(-100);
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];
    this._tickCount_local++;

    if (this.canRun("stale-query-refetch", STALE_REFETCH_COOLDOWN_MS)) {
      try {
        const timeSinceLoad = performance.now();
        if (timeSinceLoad > STALE_THRESHOLD_MS && navigator.onLine && !document.hidden) {
          const lastRefetch = Number(sessionStorage.getItem("el-last-stale-refetch") || "0");
          const sinceRefetch = Date.now() - lastRefetch;
          if (sinceRefetch > STALE_REFETCH_COOLDOWN_MS) {
            platformBus.emit("system:stale_queries_detected", {
              timestamp: Date.now(),
              timeSinceLoad: Math.round(timeSinceLoad),
              reason: "idle_threshold",
            }, "system");
            sessionStorage.setItem("el-last-stale-refetch", String(Date.now()));
            actions.push("Triggered stale query refetch after idle threshold");
            this.recordFix("stale-query-refetch", `Refetch after ${Math.round(timeSinceLoad / 1000)}s idle`, "success");
          }
        }
      } catch {
        this.recordFix("stale-query-refetch", "Failed to check stale queries", "failed");
      }
    }

    if (this.canRun("offline-recovery", OFFLINE_COOLDOWN_MS)) {
      if (navigator.onLine) {
        const wasOffline = sessionStorage.getItem("el-was-offline");
        if (wasOffline) {
          sessionStorage.removeItem("el-was-offline");
          platformBus.emit("system:online_recovered", { timestamp: Date.now() }, "system");
          actions.push("Online recovery triggered");
          this.recordFix("offline-recovery", "Triggered sync after offline", "success");
        }
      } else {
        sessionStorage.setItem("el-was-offline", "1");
        findings.push("Device currently offline");
      }
    }

    if (this.canRun("memory-pressure", MEMORY_COOLDOWN_MS)) {
      const mem = (performance as any).memory;
      if (mem && mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.85) {
        findings.push("Memory pressure detected (>85%)");
        platformBus.emit("system:memory_pressure", {
          timestamp: Date.now(),
          usedBytes: mem.usedJSHeapSize,
          limitBytes: mem.jsHeapSizeLimit,
          ratio: mem.usedJSHeapSize / mem.jsHeapSizeLimit,
        }, "system");
        this.recordFix("memory-pressure", `Pressure at ${Math.round(100 * mem.usedJSHeapSize / mem.jsHeapSizeLimit)}%`, "success");
      }
    }

    this.tickSyncRepair(findings, actions);

    if (this._tickCount_local % 4 === 0) {
      this.tickConversationConsistency(findings, actions);
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }

  private tickSyncRepair(findings: string[], actions: string[]): void {
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
            const s = (ch as any).state;
            return s === "errored" || s === "closed" || s === "timed_out";
          });

          if (staleChannels.length > 0) {
            for (const ch of staleChannels) {
              try {
                supabase.removeChannel(ch);
              } catch {}
            }
            actions.push(`Removed ${staleChannels.length} stale channel(s)`);
          }

          platformBus.emit("system:sync_requested", { reason: "gap", gap, timestamp: now, attempt: this.consecutiveSyncRepairs }, "system");
          actions.push(`Triggered sync repair — attempt ${this.consecutiveSyncRepairs}/${SYNC_REPAIR_MAX_RETRIES}`);
        } catch {
          actions.push(`Sync repair attempt ${this.consecutiveSyncRepairs} failed`);
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

      platformBus.emit(
        "orbit:thread_updated",
        { reason: "duplicate_detected", duplicateIds, timestamp: Date.now() },
        "orbit"
      );
      actions.push(`Emitted dedup signal for ${duplicateIds.length} duplicate conversation(s)`);

      if (this.consecutiveDupCycles >= 3) {
        platformBus.emit(
          "orbit:force_reload",
          { reason: "persistent_duplicates", duplicateIds, cycles: this.consecutiveDupCycles, timestamp: Date.now() },
          "orbit"
        );
        actions.push(`Forced full thread reload after ${this.consecutiveDupCycles} consecutive duplicate cycles`);
        this.consecutiveDupCycles = 0;
      }
    } else {
      this.consecutiveDupCycles = 0;
    }

    this.lastConversationCount = ids.size;
  }
}
