import type { CronRegistryEntry, EngineCriticality, CronSchedulePreset } from "../types";

const SCHEDULE_MS: Record<CronSchedulePreset, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "10m": 600_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
  on_deploy: 0,
};

class SentinelCronRegistry {
  private jobs = new Map<string, CronRegistryEntry>();

  register(entry: Omit<CronRegistryEntry, "schedule_ms" | "last_run_at" | "next_run_at" | "last_status" | "failure_count" | "skip_count"> & Partial<CronRegistryEntry>): void {
    const full: CronRegistryEntry = {
      schedule_ms: SCHEDULE_MS[entry.schedule] || 60_000,
      last_run_at: 0,
      next_run_at: 0,
      last_status: "never",
      failure_count: 0,
      skip_count: 0,
      ...entry,
    };
    this.jobs.set(entry.cron_id, full);
  }

  get(cronId: string): CronRegistryEntry | undefined {
    return this.jobs.get(cronId);
  }

  getAll(): CronRegistryEntry[] {
    return Array.from(this.jobs.values());
  }

  getByEngine(engineId: string): CronRegistryEntry[] {
    return this.getAll().filter((j) => j.engine_id === engineId);
  }

  getByCriticality(criticality: EngineCriticality): CronRegistryEntry[] {
    return this.getAll().filter((j) => j.criticality === criticality);
  }

  getEnabled(): CronRegistryEntry[] {
    return this.getAll().filter((j) => j.enabled);
  }

  recordRun(cronId: string, status: "success" | "failed" | "skipped"): void {
    const entry = this.jobs.get(cronId);
    if (!entry) return;
    entry.last_run_at = Date.now();
    entry.last_status = status;
    entry.next_run_at = Date.now() + entry.schedule_ms;
    if (status === "failed") entry.failure_count++;
    if (status === "skipped") entry.skip_count++;
  }

  getOverdue(): CronRegistryEntry[] {
    const now = Date.now();
    return this.getAll().filter((j) => j.enabled && j.next_run_at > 0 && now > j.next_run_at + j.schedule_ms);
  }

  getCollisions(): Array<{ a: string; b: string; lock_key: string }> {
    const byLock = new Map<string, CronRegistryEntry[]>();
    for (const job of this.getEnabled()) {
      if (!job.lock_key) continue;
      const group = byLock.get(job.lock_key) || [];
      group.push(job);
      byLock.set(job.lock_key, group);
    }
    const collisions: Array<{ a: string; b: string; lock_key: string }> = [];
    for (const [lock_key, group] of byLock) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          collisions.push({ a: group[i].cron_id, b: group[j].cron_id, lock_key });
        }
      }
    }
    return collisions;
  }

  getSummary(): { total: number; enabled: number; failed: number; overdue: number; collisions: number } {
    return {
      total: this.jobs.size,
      enabled: this.getEnabled().length,
      failed: this.getAll().filter((j) => j.last_status === "failed").length,
      overdue: this.getOverdue().length,
      collisions: this.getCollisions().length,
    };
  }
}

export const sentinelCronRegistry = new SentinelCronRegistry();
