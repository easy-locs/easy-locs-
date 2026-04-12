import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

const REPAIR_COOLDOWN_MS = 10_000;
const REPAIR_MAX_RETRIES = 3;

export class SyncRepairEngine extends BaseEngine {
  private repairCount = 0;
  private lastRepairTime = 0;
  private consecutiveRepairs = 0;

  constructor() {
    super({
      id: "rt-sync-repair",
      name: "Sync Repair Engine",
      category: "realtime",
      intervalMs: 45_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    if (document.hidden) {
      return { level: "observe", findings: 0, actions: [], duration: 0 };
    }

    const lastSync = Number(sessionStorage.getItem("el-last-sync-ts") || "0");
    const gap = Date.now() - lastSync;

    if (lastSync > 0 && gap > 120_000) {
      findings.push(`Sync gap: ${Math.round(gap / 1000)}s since last sync`);

      if (gap > 300_000 && navigator.onLine) {
        const now = Date.now();
        if (now - this.lastRepairTime < REPAIR_COOLDOWN_MS) {
          console.log(`[SyncRepairEngine] Skipped repair — cooldown active (${Math.round((REPAIR_COOLDOWN_MS - (now - this.lastRepairTime)) / 1000)}s remaining)`);
          return { level: "detect", findings: findings.length, actions: [], duration: 0 };
        }

        if (this.consecutiveRepairs >= REPAIR_MAX_RETRIES) {
          console.warn(`[SyncRepairEngine] Max retries (${REPAIR_MAX_RETRIES}) reached — skipping until next successful sync`);
          findings.push(`Max repair retries reached (${REPAIR_MAX_RETRIES})`);
          return { level: "detect", findings: findings.length, actions: [], duration: 0 };
        }

        this.consecutiveRepairs++;
        this.lastRepairTime = now;

        try {
          const channels = supabase.getChannels();
          const staleChannels = channels.filter(ch => {
            const s = (ch as any).state;
            return s === "errored" || s === "closed" || s === "timed_out";
          });

          if (staleChannels.length > 0) {
            for (const ch of staleChannels) {
              const topic = (ch as any).topic || "unknown";
              try {
                supabase.removeChannel(ch);
                console.log(`[SyncRepairEngine] Removed stale channel: ${topic}`);
              } catch (rmErr) {
                console.warn(`[SyncRepairEngine] Failed to remove channel ${topic}:`, rmErr);
              }
            }
            actions.push(`Removed ${staleChannels.length} stale channel(s)`);
          }

          platformBus.emit("system:sync_requested", { reason: "gap", gap, timestamp: now, attempt: this.consecutiveRepairs }, "system");
          actions.push(`Triggered targeted sync repair — attempt ${this.consecutiveRepairs}/${REPAIR_MAX_RETRIES}`);
          console.log(`[SyncRepairEngine] Repair action: targeted reconnect, attempt: ${this.consecutiveRepairs}, gap: ${Math.round(gap / 1000)}s, stale_channels_removed: ${staleChannels.length}, result: dispatched`);
        } catch (err) {
          console.error(`[SyncRepairEngine] Repair action: targeted reconnect, attempt: ${this.consecutiveRepairs}, result: failed`, err);
          actions.push(`Repair attempt ${this.consecutiveRepairs} failed`);
        }

        this.repairCount++;
      }
    } else if (lastSync > 0 && gap <= 120_000) {
      this.consecutiveRepairs = 0;
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
