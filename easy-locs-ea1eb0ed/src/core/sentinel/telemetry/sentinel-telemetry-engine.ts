import type { SentinelScores, SentinelStatus } from "../types";
import { sentinelEngineRegistry } from "../registry/module-tracker";
import { sentinelCronRegistry } from "../registry/cron-registry";

interface TelemetryEvent {
  event_type: string;
  source: string;
  timestamp: number;
  data: Record<string, unknown>;
}

interface SystemSnapshot {
  timestamp: number;
  scores: SentinelScores;
  engine_count: number;
  healthy_engines: number;
  active_crons: number;
  failed_crons: number;
  open_incidents: number;
  global_status: SentinelStatus;
}

class SentinelTelemetryEngine {
  private events: TelemetryEvent[] = [];
  private snapshots: SystemSnapshot[] = [];
  private metrics = new Map<string, number>();
  private readonly MAX_EVENTS = 1000;
  private readonly MAX_SNAPSHOTS = 200;

  emit(eventType: string, source: string, data: Record<string, unknown> = {}): void {
    this.events.push({ event_type: eventType, source, timestamp: Date.now(), data });
    if (this.events.length > this.MAX_EVENTS) {
      this.events.splice(0, this.events.length - this.MAX_EVENTS);
    }
  }

  increment(metric: string, amount = 1): void {
    this.metrics.set(metric, (this.metrics.get(metric) || 0) + amount);
  }

  gauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  takeSnapshot(scores: SentinelScores, openIncidents: number): SystemSnapshot {
    const engineSummary = sentinelEngineRegistry.getSummary();
    const cronSummary = sentinelCronRegistry.getSummary();

    const snapshot: SystemSnapshot = {
      timestamp: Date.now(),
      scores,
      engine_count: engineSummary.total,
      healthy_engines: engineSummary.healthy,
      active_crons: cronSummary.enabled,
      failed_crons: cronSummary.failed,
      open_incidents: openIncidents,
      global_status: engineSummary.unhealthy > 0 ? "unhealthy" : engineSummary.degraded > 0 ? "degraded" : "healthy",
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.splice(0, this.snapshots.length - this.MAX_SNAPSHOTS);
    }

    return snapshot;
  }

  getSnapshots(limit = 20): SystemSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  getLatestSnapshot(): SystemSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getEvents(filter?: { type?: string; source?: string; since?: number }, limit = 50): TelemetryEvent[] {
    let filtered = this.events;
    if (filter?.type) filtered = filtered.filter((e) => e.event_type === filter.type);
    if (filter?.source) filtered = filtered.filter((e) => e.source === filter.source);
    if (filter?.since) filtered = filtered.filter((e) => e.timestamp >= filter.since!);
    return filtered.slice(-limit);
  }

  getStats(): { total_events: number; total_snapshots: number; metrics_count: number; latest_snapshot_age: number } {
    const latest = this.getLatestSnapshot();
    return {
      total_events: this.events.length,
      total_snapshots: this.snapshots.length,
      metrics_count: this.metrics.size,
      latest_snapshot_age: latest ? Date.now() - latest.timestamp : -1,
    };
  }
}

export const sentinelTelemetryEngine = new SentinelTelemetryEngine();
