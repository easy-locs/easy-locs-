import type {
  ApiConnector,
  ConnectorConfig,
  ConnectorHealth,
  ConnectorMetrics,
  ConnectorStatus,
  NormalizedDataPoint,
} from "../types";

export abstract class BaseConnector implements ApiConnector {
  config: ConnectorConfig;
  health: ConnectorHealth;
  private _syncCount = 0;
  private _errorCount = 0;
  private _totalRecords = 0;
  private _totalBytes = 0;
  private _lastSyncAt: number | null = null;
  private _syncDurations: number[] = [];
  private readonly _maxDurationSamples = 50;
  protected _usingFallback = false;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.health = {
      connectorId: config.id,
      status: "pending",
      lastCheckAt: 0,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      consecutiveFailures: 0,
      avgResponseTimeMs: 0,
      responseTimeSamples: [],
      errorRate: 0,
      quotaUsed: 0,
      quotaLimit: config.quotaLimit ?? 0,
      quotaResetAt: 0,
      uptimePercent: 100,
    };
  }

  async fetch(): Promise<NormalizedDataPoint[]> {
    if (!this.config.enabled) return [];

    const start = performance.now();
    let lastErr: Error | null = null;
    const maxRetries = this.config.retryCount ?? 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.doFetch();
        const durationMs = Math.round(performance.now() - start);

        this._syncCount++;
        this._totalRecords += data.length;
        this._lastSyncAt = Date.now();
        this._syncDurations.push(durationMs);
        if (this._syncDurations.length > this._maxDurationSamples) {
          this._syncDurations.shift();
        }

        let totalBytes = 0;
        for (const dp of data) totalBytes += dp.rawSize;
        this._totalBytes += totalBytes;

        this.updateHealthSuccess(durationMs);
        return data;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
        }
      }
    }

    const durationMs = Math.round(performance.now() - start);
    this._syncCount++;
    this._errorCount++;
    this.updateHealthError(lastErr?.message ?? "Unknown error", durationMs);
    throw lastErr ?? new Error("Fetch failed");
  }

  async checkHealth(): Promise<ConnectorHealth> {
    const start = performance.now();
    try {
      const ok = await this.doHealthCheck();
      const durationMs = Math.round(performance.now() - start);

      if (ok) {
        this.updateHealthSuccess(durationMs);
      } else {
        this.updateHealthError("Health check returned false", durationMs);
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.updateHealthError(err instanceof Error ? err.message : String(err), durationMs);
    }
    return this.health;
  }

  getMetrics(): ConnectorMetrics {
    const avgDuration = this._syncDurations.length > 0
      ? Math.round(this._syncDurations.reduce((a, b) => a + b, 0) / this._syncDurations.length)
      : 0;

    return {
      connectorId: this.config.id,
      totalSyncs: this._syncCount,
      totalRecords: this._totalRecords,
      totalErrors: this._errorCount,
      totalBytesReceived: this._totalBytes,
      avgSyncDurationMs: avgDuration,
      lastSyncAt: this._lastSyncAt,
      dataFreshnessMs: this._lastSyncAt ? Date.now() - this._lastSyncAt : Infinity,
    };
  }

  recordExternalSync(success: boolean, recordCount: number, durationMs: number, bytesReceived: number, error?: string): void {
    this._syncCount++;
    if (!success) {
      this._errorCount++;
      this.updateHealthError(error ?? "External sync failed", durationMs);
    } else {
      this._totalRecords += recordCount;
      this._totalBytes += bytesReceived;
      this._lastSyncAt = Date.now();
      this._syncDurations.push(durationMs);
      if (this._syncDurations.length > this._maxDurationSamples) {
        this._syncDurations.shift();
      }
      this.updateHealthSuccess(durationMs);
    }
  }

  hydrateFromSnapshot(snapshot: {
    status: string;
    lastSyncAt: number | null;
    lastSuccessAt: number | null;
    lastError: string | null;
    lastRecordCount: number;
    lastDurationMs: number;
  }): void {
    this._lastSyncAt = snapshot.lastSyncAt;

    if (snapshot.lastSyncAt) {
      this.health.lastCheckAt = snapshot.lastSyncAt;
    }
    if (snapshot.lastSuccessAt) {
      this.health.lastSuccessAt = snapshot.lastSuccessAt;
    }
    if (snapshot.lastError) {
      this.health.lastError = snapshot.lastError;
      this.health.lastErrorAt = snapshot.lastSyncAt ?? Date.now();
    } else {
      this.health.lastError = null;
      this.health.consecutiveFailures = 0;
    }

    if (snapshot.lastDurationMs > 0) {
      this.health.avgResponseTimeMs = snapshot.lastDurationMs;
      this.health.responseTimeSamples = [snapshot.lastDurationMs];
    }

    const statusMap: Record<string, ConnectorStatus> = {
      connected: "connected",
      degraded: "degraded",
      offline: "offline",
      pending: "pending",
    };
    this.health.status = statusMap[snapshot.status] ?? "pending";
  }

  hydrateMetricsFromHistory(syncEvents: Array<{
    success: boolean;
    recordCount: number;
    durationMs: number;
    bytesReceived: number;
    syncedAt: number;
  }>): void {
    let totalSyncs = 0;
    let totalErrors = 0;
    let totalRecords = 0;
    let totalBytes = 0;
    const durations: number[] = [];
    let lastSyncAt: number | null = null;

    for (const event of syncEvents) {
      totalSyncs++;
      if (!event.success) totalErrors++;
      totalRecords += event.recordCount;
      totalBytes += event.bytesReceived;
      if (event.durationMs > 0) durations.push(event.durationMs);
      if (lastSyncAt === null || event.syncedAt > lastSyncAt) {
        lastSyncAt = event.syncedAt;
      }
    }

    this._syncCount = totalSyncs;
    this._errorCount = totalErrors;
    this._totalRecords = totalRecords;
    this._totalBytes = totalBytes;
    this._syncDurations = durations.slice(-this._maxDurationSamples);
    if (lastSyncAt !== null) {
      this._lastSyncAt = lastSyncAt;
    }

    this.health.errorRate = totalSyncs > 0 ? totalErrors / totalSyncs : 0;
  }

  protected abstract doFetch(): Promise<NormalizedDataPoint[]>;
  protected abstract doHealthCheck(): Promise<boolean>;

  private updateHealthSuccess(durationMs: number): void {
    const now = Date.now();
    this.health.lastCheckAt = now;
    this.health.lastSuccessAt = now;
    this.health.consecutiveFailures = 0;
    this.health.lastError = null;

    this.health.responseTimeSamples.push(durationMs);
    if (this.health.responseTimeSamples.length > 20) {
      this.health.responseTimeSamples.shift();
    }
    this.health.avgResponseTimeMs = Math.round(
      this.health.responseTimeSamples.reduce((a, b) => a + b, 0) / this.health.responseTimeSamples.length
    );

    this.health.errorRate = this._syncCount > 0 ? this._errorCount / this._syncCount : 0;
    this.health.status = this.deriveStatus();
  }

  private updateHealthError(error: string, durationMs: number): void {
    const now = Date.now();
    this.health.lastCheckAt = now;
    this.health.lastErrorAt = now;
    this.health.lastError = error;
    this.health.consecutiveFailures++;

    this.health.responseTimeSamples.push(durationMs);
    if (this.health.responseTimeSamples.length > 20) {
      this.health.responseTimeSamples.shift();
    }
    this.health.avgResponseTimeMs = Math.round(
      this.health.responseTimeSamples.reduce((a, b) => a + b, 0) / this.health.responseTimeSamples.length
    );

    this.health.errorRate = this._syncCount > 0 ? this._errorCount / this._syncCount : 0;
    this.health.status = this.deriveStatus();
  }

  markFallback(usingFallback: boolean): void {
    this._usingFallback = usingFallback;
  }

  private deriveStatus(): ConnectorStatus {
    if (!this.config.enabled) return "offline";
    if (this.health.consecutiveFailures >= 5) return "offline";
    if (this.health.consecutiveFailures >= 2) return "degraded";
    if (this.health.errorRate > 0.3) return "degraded";
    if (this._usingFallback) return "degraded";
    if (this.health.lastSuccessAt === null) return "pending";
    return "connected";
  }
}
