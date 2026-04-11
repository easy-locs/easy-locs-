import type { JobRunRecord } from "../types";
import { sentinelCronRegistry } from "../registry/cron-registry";

let jobRunCounter = 0;

type JobHandler = () => Promise<{ summary: string }>;

interface ActiveJob {
  cron_id: string;
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
  handler: JobHandler;
  retryTimers: ReturnType<typeof setTimeout>[];
}

class SentinelCronOrchestrator {
  private handlers = new Map<string, JobHandler>();
  private activeJobs = new Map<string, ActiveJob>();
  private runHistory: JobRunRecord[] = [];
  private locks = new Set<string>();
  private deadLetterQueue: Array<{ cron_id: string; error: string; timestamp: number }> = [];
  private _started = false;
  private readonly MAX_HISTORY = 500;
  private readonly MAX_DLQ = 100;

  registerHandler(cronId: string, handler: JobHandler): void {
    this.handlers.set(cronId, handler);
  }

  registerBuiltinJobs(): void {
    const jobs: Array<{ id: string; name: string; engine: string; schedule: "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "6h" | "24h"; crit: "critical" | "high" | "medium" | "low"; lock: string }> = [
      { id: "engine_heartbeat_check", name: "Engine Heartbeat Check", engine: "sentinel-health", schedule: "1m", crit: "critical", lock: "heartbeat" },
      { id: "conflict_scan", name: "Conflict Scan", engine: "sentinel-conflict", schedule: "5m", crit: "critical", lock: "conflict" },
      { id: "taxonomy_integrity_scan", name: "Taxonomy Integrity Scan", engine: "sentinel-taxonomy", schedule: "15m", crit: "high", lock: "taxonomy" },
      { id: "data_integrity_scan", name: "Data Integrity Scan", engine: "sentinel-audit", schedule: "10m", crit: "high", lock: "data-integrity" },
      { id: "media_relevance_scan", name: "Media Relevance Scan", engine: "sentinel-media", schedule: "15m", crit: "medium", lock: "media" },
      { id: "seo_public_page_scan", name: "SEO Public Page Scan", engine: "sentinel-seo", schedule: "30m", crit: "high", lock: "seo" },
      { id: "performance_budget_scan", name: "Performance Budget Scan", engine: "sentinel-perf", schedule: "30m", crit: "high", lock: "performance" },
      { id: "route_integrity_scan", name: "Route Integrity Scan", engine: "sentinel-routing", schedule: "15m", crit: "high", lock: "routes" },
      { id: "dashboard_card_integrity_scan", name: "Dashboard Card Integrity", engine: "sentinel-dashboard", schedule: "15m", crit: "medium", lock: "cards" },
      { id: "wallet_integrity_scan", name: "Wallet Integrity Scan", engine: "sentinel-wallet", schedule: "5m", crit: "critical", lock: "wallet" },
      { id: "orbit_integrity_scan", name: "Orbit Integrity Scan", engine: "sentinel-orbit", schedule: "5m", crit: "critical", lock: "orbit" },
      { id: "delivery_integrity_scan", name: "Delivery Integrity Scan", engine: "sentinel-delivery", schedule: "5m", crit: "critical", lock: "delivery" },
      { id: "flight_integrity_scan", name: "Flight Integrity Scan", engine: "sentinel-flight", schedule: "10m", crit: "high", lock: "flight" },
      { id: "security_scan", name: "Security Scan", engine: "sentinel-security", schedule: "1h", crit: "critical", lock: "security" },
      { id: "dependency_scan", name: "Dependency Scan", engine: "sentinel-deps", schedule: "6h", crit: "medium", lock: "deps" },
      { id: "stale_data_cleanup", name: "Stale Data Cleanup", engine: "sentinel-maintenance", schedule: "1h", crit: "low", lock: "stale-cleanup" },
      { id: "orphan_cleanup", name: "Orphan Cleanup", engine: "sentinel-maintenance", schedule: "6h", crit: "low", lock: "orphan-cleanup" },
      { id: "cache_revalidate", name: "Cache Revalidation", engine: "sentinel-cache", schedule: "30m", crit: "medium", lock: "cache" },
      { id: "full_god_audit", name: "Full God Audit", engine: "sentinel-audit", schedule: "24h", crit: "critical", lock: "god-audit" },
      { id: "invariant_check", name: "Invariant Check", engine: "sentinel-invariants", schedule: "5m", crit: "critical", lock: "invariants" },
      { id: "healing_scan", name: "Healing Scan", engine: "sentinel-healing", schedule: "10m", crit: "medium", lock: "healing" },
      { id: "workflow_health_check", name: "Workflow Health Check", engine: "sentinel-workflows", schedule: "5m", crit: "high", lock: "workflows" },
      { id: "quality_gate_refresh", name: "Quality Gate Refresh", engine: "sentinel-quality", schedule: "10m", crit: "high", lock: "quality" },
      { id: "observability_snapshot", name: "Observability Snapshot", engine: "sentinel-observability", schedule: "1m", crit: "medium", lock: "observability" },
      { id: "incident_check", name: "Incident Check", engine: "sentinel-incidents", schedule: "1m", crit: "high", lock: "incidents" },
    ];

    for (const j of jobs) {
      sentinelCronRegistry.register({
        cron_id: j.id,
        job_name: j.name,
        engine_id: j.engine,
        schedule: j.schedule,
        enabled: true,
        timeout_sec: 30,
        retry_policy: { max_retries: 3, backoff_ms: 1000 },
        lock_key: j.lock,
        criticality: j.crit,
      });
    }
  }

  startAll(): void {
    if (this._started) return;
    this._started = true;

    for (const entry of sentinelCronRegistry.getEnabled()) {
      const handler = this.handlers.get(entry.cron_id);
      if (!handler) continue;

      const active: ActiveJob = { cron_id: entry.cron_id, timer: null, running: false, handler, retryTimers: [] };

      active.timer = setInterval(() => {
        if (active.running) {
          sentinelCronRegistry.recordRun(entry.cron_id, "skipped");
          return;
        }
        this.executeJob(active, entry);
      }, entry.schedule_ms);

      this.activeJobs.set(entry.cron_id, active);
    }
  }

  private async executeJob(active: ActiveJob, entry: typeof sentinelCronRegistry extends { get: (id: string) => infer R } ? NonNullable<R> : never): Promise<void> {
    if (this.locks.has(entry.lock_key)) {
      sentinelCronRegistry.recordRun(entry.cron_id, "skipped");
      return;
    }

    active.running = true;
    this.locks.add(entry.lock_key);
    const startTime = Date.now();
    const runId = `JRUN_${Date.now()}_${++jobRunCounter}`;

    try {
      const result = await this.executeWithTimeout(active.handler(), entry.timeout_sec * 1000);
      const record: JobRunRecord = {
        run_id: runId,
        cron_id: entry.cron_id,
        started_at: startTime,
        ended_at: Date.now(),
        status: "success",
        retry_count: 0,
        lock_wait_ms: 0,
        output_summary: result.summary,
        error_summary: "",
      };
      this.addRunHistory(record);
      sentinelCronRegistry.recordRun(entry.cron_id, "success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const record: JobRunRecord = {
        run_id: runId,
        cron_id: entry.cron_id,
        started_at: startTime,
        ended_at: Date.now(),
        status: "failed",
        retry_count: 0,
        lock_wait_ms: 0,
        output_summary: "",
        error_summary: errorMsg,
      };
      this.addRunHistory(record);
      sentinelCronRegistry.recordRun(entry.cron_id, "failed");

      if (entry.failure_count >= entry.retry_policy.max_retries) {
        this.deadLetterQueue.push({ cron_id: entry.cron_id, error: errorMsg, timestamp: Date.now() });
        if (this.deadLetterQueue.length > this.MAX_DLQ) {
          this.deadLetterQueue.splice(0, this.deadLetterQueue.length - this.MAX_DLQ);
        }
      }
    } finally {
      active.running = false;
      this.locks.delete(entry.lock_key);
    }
  }

  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Job timed out")), timeoutMs);
      promise
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  private addRunHistory(record: JobRunRecord): void {
    this.runHistory.push(record);
    if (this.runHistory.length > this.MAX_HISTORY) {
      this.runHistory.splice(0, this.runHistory.length - this.MAX_HISTORY);
    }
  }

  stopAll(): void {
    this._started = false;
    for (const active of this.activeJobs.values()) {
      if (active.timer) {
        clearInterval(active.timer);
        active.timer = null;
      }
      for (const rt of active.retryTimers) {
        clearTimeout(rt);
      }
      active.retryTimers = [];
    }
    this.activeJobs.clear();
    this.locks.clear();
  }

  getDeadLetterQueue(): typeof this.deadLetterQueue {
    return [...this.deadLetterQueue];
  }

  getRunHistory(limit = 50): JobRunRecord[] {
    return this.runHistory.slice(-limit);
  }

  getStats(): { started: boolean; active_jobs: number; total_runs: number; dlq_size: number; active_locks: number } {
    return {
      started: this._started,
      active_jobs: this.activeJobs.size,
      total_runs: this.runHistory.length,
      dlq_size: this.deadLetterQueue.length,
      active_locks: this.locks.size,
    };
  }
}

export const sentinelCronOrchestrator = new SentinelCronOrchestrator();
