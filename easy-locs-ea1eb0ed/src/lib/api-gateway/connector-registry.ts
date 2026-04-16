import type {
  ApiConnector,
  ConnectorConfig,
  ConnectorHealth,
  ConnectorMetrics,
  ConnectorStatus,
  DataDomain,
  GatewayPulse,
  SyncRecord,
} from "./types";

const connectors = new Map<string, ApiConnector>();
const syncHistory = new Map<string, SyncRecord[]>();
const MAX_SYNC_HISTORY = 100;

export function registerConnector(connector: ApiConnector): void {
  if (connectors.has(connector.config.id)) {
    console.warn(`[api-gateway] Connector "${connector.config.id}" already registered, replacing`);
  }
  connectors.set(connector.config.id, connector);
  if (!syncHistory.has(connector.config.id)) {
    syncHistory.set(connector.config.id, []);
  }
}

export function unregisterConnector(id: string): boolean {
  syncHistory.delete(id);
  return connectors.delete(id);
}

export function getConnector(id: string): ApiConnector | undefined {
  return connectors.get(id);
}

export function listConnectors(): ApiConnector[] {
  return Array.from(connectors.values());
}

export function listConnectorsByDomain(domain: DataDomain): ApiConnector[] {
  return Array.from(connectors.values()).filter(
    (c) => c.config.domain === domain
  );
}

export function listConnectorsByStatus(status: ConnectorStatus): ApiConnector[] {
  return Array.from(connectors.values()).filter(
    (c) => c.health.status === status
  );
}

export function getConnectorHealth(id: string): ConnectorHealth | undefined {
  return connectors.get(id)?.health;
}

export function getAllHealth(): Map<string, ConnectorHealth> {
  const healthMap = new Map<string, ConnectorHealth>();
  for (const [id, connector] of connectors) {
    healthMap.set(id, connector.health);
  }
  return healthMap;
}

export function recordSync(record: SyncRecord): void {
  const history = syncHistory.get(record.connectorId) ?? [];
  history.push(record);
  if (history.length > MAX_SYNC_HISTORY) {
    history.splice(0, history.length - MAX_SYNC_HISTORY);
  }
  syncHistory.set(record.connectorId, history);
}

export function getSyncHistory(connectorId: string): SyncRecord[] {
  return syncHistory.get(connectorId) ?? [];
}

export function replaceSyncHistory(connectorId: string, records: SyncRecord[]): void {
  const trimmed = records.slice(-MAX_SYNC_HISTORY);
  syncHistory.set(connectorId, trimmed);
}

export function clearAllSyncHistory(): void {
  for (const [id] of syncHistory) {
    syncHistory.set(id, []);
  }
}

export function getAllMetrics(): Map<string, ConnectorMetrics> {
  const metricsMap = new Map<string, ConnectorMetrics>();
  for (const [id, connector] of connectors) {
    metricsMap.set(id, connector.getMetrics());
  }
  return metricsMap;
}

export function calculatePulse(): GatewayPulse {
  const all = listConnectors();
  const now = Date.now();
  const last24h = now - 86_400_000;

  let connectedCount = 0;
  let degradedCount = 0;
  let offlineCount = 0;
  let pendingCount = 0;
  let totalResponseTime = 0;
  let totalErrors = 0;
  let totalSyncsCount = 0;
  let syncsLast24h = 0;
  let recordsLast24h = 0;

  for (const connector of all) {
    const h = connector.health;
    switch (h.status) {
      case "connected": connectedCount++; break;
      case "degraded": degradedCount++; break;
      case "offline": offlineCount++; break;
      case "pending": pendingCount++; break;
    }
    totalResponseTime += h.avgResponseTimeMs;

    const metrics = connector.getMetrics();
    totalErrors += metrics.totalErrors;
    totalSyncsCount += metrics.totalSyncs;

    const history = getSyncHistory(connector.config.id);
    for (const sync of history) {
      if (sync.syncedAt >= last24h) {
        syncsLast24h++;
        recordsLast24h += sync.recordCount;
      }
    }
  }

  const total = all.length || 1;
  const avgResponseTime = total > 0 ? totalResponseTime / total : 0;
  const overallErrorRate = totalSyncsCount > 0 ? totalErrors / totalSyncsCount : 0;

  const healthScore = total > 0
    ? ((connectedCount * 100) + (degradedCount * 50) + (pendingCount * 25)) / total
    : 0;
  const errorPenalty = Math.min(overallErrorRate * 100, 30);
  const score = Math.max(0, Math.min(100, Math.round(healthScore - errorPenalty)));

  return {
    score,
    totalConnectors: all.length,
    connectedCount,
    degradedCount,
    offlineCount,
    pendingCount,
    totalSyncsLast24h: syncsLast24h,
    totalRecordsLast24h: recordsLast24h,
    avgResponseTimeMs: Math.round(avgResponseTime),
    overallErrorRate: Math.round(overallErrorRate * 10000) / 10000,
    calculatedAt: now,
  };
}

export function getRegistrySnapshot() {
  return {
    connectors: listConnectors().map((c) => ({
      config: c.config,
      health: c.health,
      metrics: c.getMetrics(),
    })),
    pulse: calculatePulse(),
    syncHistory: Object.fromEntries(syncHistory),
  };
}
