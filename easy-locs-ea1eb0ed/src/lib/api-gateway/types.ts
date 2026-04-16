export type ConnectorType = "rest" | "webhook" | "rss" | "graphql" | "scraper";
export type ConnectorStatus = "connected" | "degraded" | "offline" | "pending";
export type AuthMethod = "none" | "api_key" | "bearer" | "oauth2" | "basic" | "custom";
export type DataDomain = "real_estate" | "food_delivery" | "weather" | "news" | "forex" | "prayer" | "government" | "social" | "market" | "transport" | "custom";

export interface ConnectorConfig {
  id: string;
  name: string;
  description: string;
  type: ConnectorType;
  domain: DataDomain;
  pollingIntervalMs: number;
  authMethod: AuthMethod;
  baseUrl: string;
  healthCheckUrl?: string;
  readOnlyEndpoints: string[];
  enabled: boolean;
  tags: string[];
  fallbackConnectorId?: string;
  quotaLimit?: number;
  quotaWindowMs?: number;
  timeoutMs?: number;
  retryCount?: number;
}

export interface ConnectorHealth {
  connectorId: string;
  status: ConnectorStatus;
  lastCheckAt: number;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  avgResponseTimeMs: number;
  responseTimeSamples: number[];
  errorRate: number;
  quotaUsed: number;
  quotaLimit: number;
  quotaResetAt: number;
  uptimePercent: number;
}

export interface SyncRecord {
  connectorId: string;
  syncedAt: number;
  durationMs: number;
  recordCount: number;
  success: boolean;
  error?: string;
  bytesReceived: number;
}

export interface NormalizedDataPoint {
  connectorId: string;
  domain: DataDomain;
  timestamp: number;
  data: Record<string, unknown>;
  rawSize: number;
  normalizedAt: number;
}

export interface ConnectorMetrics {
  connectorId: string;
  totalSyncs: number;
  totalRecords: number;
  totalErrors: number;
  totalBytesReceived: number;
  avgSyncDurationMs: number;
  lastSyncAt: number | null;
  dataFreshnessMs: number;
}

export interface GatewayPulse {
  score: number;
  totalConnectors: number;
  connectedCount: number;
  degradedCount: number;
  offlineCount: number;
  pendingCount: number;
  totalSyncsLast24h: number;
  totalRecordsLast24h: number;
  avgResponseTimeMs: number;
  overallErrorRate: number;
  calculatedAt: number;
}

export interface ApiConnector {
  config: ConnectorConfig;
  health: ConnectorHealth;
  fetch(): Promise<NormalizedDataPoint[]>;
  checkHealth(): Promise<ConnectorHealth>;
  getMetrics(): ConnectorMetrics;
  recordExternalSync(success: boolean, recordCount: number, durationMs: number, bytesReceived: number, error?: string): void;
  markFallback(usingFallback: boolean): void;
  hydrateFromSnapshot(snapshot: {
    status: string;
    lastSyncAt: number | null;
    lastSuccessAt: number | null;
    lastError: string | null;
    lastRecordCount: number;
    lastDurationMs: number;
  }): void;
  hydrateMetricsFromHistory(syncEvents: Array<{
    success: boolean;
    recordCount: number;
    durationMs: number;
    bytesReceived: number;
    syncedAt: number;
  }>): void;
}
