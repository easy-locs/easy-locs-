import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class SyncRepairEngine extends BaseEngine {
  private repairCount = 0;

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
        platformBus.emit("system:sync_requested" as any, { reason: "gap", gap });
        actions.push("Triggered sync repair after 5min gap");
        this.repairCount++;
        sessionStorage.setItem("el-last-sync-ts", String(Date.now()));
      }
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
