import type { JobRunRecord } from "../types";
import { sentinelCronRegistry } from "../registry/cron-registry";

type JobHandler = () => Promise<{ summary: string }>;

class SentinelCronOrchestrator {
  private handlers = new Map<string, JobHandler>();
  private runHistory: JobRunRecord[] = [];
  private _started = false;
  private readonly MAX_HISTORY = 500;

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
    console.info(
      "[sentinel-cron] Client-side intervals disabled — all sentinel jobs are dispatched server-side via pg_cron → autonomous-cron-dispatcher Edge Function. " +
      "Handler registry is retained for on-demand invocation from the Autonomy Dashboard."
    );
  }

  stopAll(): void {
    this._started = false;
  }

  getHandler(cronId: string): JobHandler | undefined {
    return this.handlers.get(cronId);
  }

  recordRun(record: JobRunRecord): void {
    this.runHistory.push(record);
    if (this.runHistory.length > this.MAX_HISTORY) {
      this.runHistory.splice(0, this.runHistory.length - this.MAX_HISTORY);
    }
  }

  getRunHistory(limit = 50): JobRunRecord[] {
    return this.runHistory.slice(-limit);
  }

  getStats(): { started: boolean; active_jobs: number; total_runs: number; dlq_size: number; active_locks: number } {
    const deadRuns = this.runHistory.filter(r => r.status === "failed" && r.retry_count >= 3);
    return {
      started: this._started,
      active_jobs: this.handlers.size,
      total_runs: this.runHistory.length,
      dlq_size: deadRuns.length,
      active_locks: 0,
    };
  }

  getDeadLetterQueue(): Array<{ cron_id: string; error: string; timestamp: number }> {
    return this.runHistory
      .filter(r => r.status === "failed" && r.retry_count >= 3)
      .map(r => ({ cron_id: r.cron_id, error: r.error_summary, timestamp: r.ended_at }));
  }
}

export const sentinelCronOrchestrator = new SentinelCronOrchestrator();
