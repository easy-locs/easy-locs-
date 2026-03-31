/**
 * Auto-Heal Engine — Self-repair for queue, realtime, cache, and state.
 * Detects corruption/stuck states and recovers gracefully.
 */

import { connectionManager } from "@/lib/network/connection-manager";
import { backgroundSync } from "@/lib/sync/background-sync";

interface HealAction {
  name: string;
  detect: () => boolean | Promise<boolean>;
  heal: () => Promise<void>;
  lastRun: number;
  cooldownMs: number;
}

class AutoHealEngine {
  private actions: HealAction[] = [];
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 30_000; // 30 seconds

  constructor() {
    this.registerDefaultActions();
  }

  /** Register a heal action */
  register(action: Omit<HealAction, "lastRun">): void {
    this.actions.push({ ...action, lastRun: 0 });
  }

  /** Start periodic health checks */
  start(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => this.runChecks(), this.checkIntervalMs);
    // Initial check after 5s
    setTimeout(() => this.runChecks(), 5000);
  }

  /** Stop periodic checks */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /** Run all health checks */
  private async runChecks(): Promise<void> {
    const now = Date.now();
    for (const action of this.actions) {
      if (now - action.lastRun < action.cooldownMs) continue;
      try {
        const needsHeal = await action.detect();
        if (needsHeal) {
          console.warn(`[auto-heal] Triggering: ${action.name}`);
          await action.heal();
          action.lastRun = now;
        }
      } catch (err) {
        console.error(`[auto-heal] Failed: ${action.name}`, err);
      }
    }
  }

  /** Register default heal actions */
  private registerDefaultActions(): void {
    // 1. Realtime disconnected → trigger background sync catch-up
    this.register({
      name: "realtime-catchup",
      cooldownMs: 60_000,
      detect: () => {
        return connectionManager.isOnline() && connectionManager.getState() === "online";
      },
      heal: async () => {
        await backgroundSync.triggerSync("auto-heal-catchup");
      },
    });

    // 2. Stale local cache → purge entries older than 1 hour
    this.register({
      name: "cache-staleness",
      cooldownMs: 5 * 60_000,
      detect: () => {
        try {
          const cursors = localStorage.getItem("orbit_sync_cursors");
          if (!cursors) return false;
          const parsed = JSON.parse(cursors);
          if (!parsed.lastFullSync) return true;
          const age = Date.now() - new Date(parsed.lastFullSync).getTime();
          return age > 60 * 60 * 1000; // 1 hour
        } catch { return false; }
      },
      heal: async () => {
        // Just trigger a sync, don't purge cache (user might be offline)
        if (connectionManager.isOnline()) {
          await backgroundSync.triggerSync("auto-heal-stale-cache");
        }
      },
    });

    // 3. Queue stuck detection (jobs older than 5 minutes in "running" state)
    this.register({
      name: "queue-stuck",
      cooldownMs: 2 * 60_000,
      detect: async () => {
        try {
          const { getPendingJobs } = await import("@/lib/queue/write-ahead-queue");
          const jobs = await getPendingJobs();
          return jobs.some(j => j.status === "failed" && j.attempts < j.maxAttempts);
        } catch { return false; }
      },
      heal: async () => {
        // Re-trigger background sync which processes the queue
        await backgroundSync.triggerSync("auto-heal-queue");
      },
    });
  }

  /** Force immediate heal cycle (for support/debugging) */
  async forceHeal(): Promise<string[]> {
    const healed: string[] = [];
    for (const action of this.actions) {
      try {
        const needsHeal = await action.detect();
        if (needsHeal) {
          await action.heal();
          action.lastRun = Date.now();
          healed.push(action.name);
        }
      } catch {}
    }
    return healed;
  }

  destroy(): void {
    this.stop();
    this.actions = [];
  }
}

// Singleton
export const autoHealEngine = new AutoHealEngine();
