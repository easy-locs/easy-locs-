export type {
  ConnectorType,
  ConnectorStatus,
  AuthMethod,
  DataDomain,
  ConnectorConfig,
  ConnectorHealth,
  SyncRecord,
  NormalizedDataPoint,
  ConnectorMetrics,
  GatewayPulse,
  ApiConnector,
} from "./types";

export {
  registerConnector,
  unregisterConnector,
  getConnector,
  listConnectors,
  listConnectorsByDomain,
  listConnectorsByStatus,
  getConnectorHealth,
  getAllHealth,
  recordSync,
  getSyncHistory,
  replaceSyncHistory,
  clearAllSyncHistory,
  getAllMetrics,
  calculatePulse,
  getRegistrySnapshot,
} from "./connector-registry";

export { orchestrationEngine } from "./orchestration-engine";
export { initIntelligenceBridge, getRecentCorrelations, getIntelligenceSummary } from "./intelligence-bridge";
export { bootApiGateway, shutdownApiGateway, isGatewayBooted } from "./gateway-boot";
export { BaseConnector } from "./connectors/base-connector";
export { GenericRestConnector, createConnectorConfig } from "./connectors/connector-template";
export { CONNECTOR_SPECS, getConnectorSpec } from "./connector-configs";
export type { ConnectorSpec } from "./connector-configs";
