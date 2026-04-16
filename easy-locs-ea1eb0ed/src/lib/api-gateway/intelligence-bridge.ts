import { platformBus } from "@/lib/shared/platform-bus";
import { listConnectors, calculatePulse, getAllMetrics } from "./connector-registry";
import type { DataDomain, NormalizedDataPoint } from "./types";

interface CorrelationSignal {
  id: string;
  type: "opportunity" | "risk" | "trend" | "anomaly";
  title: string;
  description: string;
  sources: string[];
  confidence: number;
  timestamp: number;
  data: Record<string, unknown>;
}

const correlationBuffer = new Map<DataDomain, NormalizedDataPoint[]>();
const BUFFER_WINDOW_MS = 300_000;
const recentSignals: CorrelationSignal[] = [];
const MAX_SIGNALS = 50;

export function initIntelligenceBridge(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on("system:gateway_data_received", (event) => {
      const payload = event.payload as Record<string, unknown>;
      const connectorId = typeof payload?.connectorId === "string" ? payload.connectorId : "";
      const domain = typeof payload?.domain === "string" ? payload.domain : "custom";
      const recordCount = typeof payload?.recordCount === "number" ? payload.recordCount : 0;
      if (!connectorId) return;

      platformBus.emit(
        "system:intelligence_data_ingested",
        {
          source: "api_gateway",
          connectorId,
          domain,
          recordCount,
          timestamp: Date.now(),
        },
        "system"
      );

      ingestIntoOmega(connectorId, domain, recordCount);
      reportToSentinel(connectorId, domain, recordCount, true);

      bufferForCorrelation(connectorId, domain as DataDomain);
    })
  );

  unsubs.push(
    platformBus.on("system:gateway_sync_error", (event) => {
      const errorPayload = event.payload as Record<string, unknown>;
      const connectorId = typeof errorPayload?.connectorId === "string" ? errorPayload.connectorId : "unknown";
      const connectorName = typeof errorPayload?.connectorName === "string" ? errorPayload.connectorName : "Unknown";
      const error = typeof errorPayload?.error === "string" ? errorPayload.error : "Unknown error";

      platformBus.emit(
        "system:intelligence_alert",
        {
          source: "api_gateway",
          severity: "warning",
          title: `Data source degraded: ${connectorName}`,
          description: `Connector ${connectorId} sync failed: ${error}`,
          timestamp: Date.now(),
        },
        "system"
      );

      reportToSentinel(connectorId, "custom", 0, false, error);
    })
  );

  const correlationTimer = setInterval(() => {
    runCrossSourceCorrelation();
  }, 60_000);

  unsubs.push(() => clearInterval(correlationTimer));

  return () => unsubs.forEach((fn) => fn());
}

function ingestIntoOmega(connectorId: string, domain: string, recordCount: number): void {
  try {
    import("@/core/omega/omega-core").then(({ omegaCore }) => {
      if (omegaCore.getPhase() !== "running") return;

      const kg = omegaCore.engines.knowledgeGraph;
      const nodeType = "DEMAND_SIGNAL" as const;
      kg.addNode(nodeType, `gateway:${connectorId}`, domain, {
        connectorId,
        recordCount,
        ingestedAt: Date.now(),
        type: "api_gateway_data",
      });
    }).catch(() => {});
  } catch {
    // Omega integration is non-blocking
  }
}

function reportToSentinel(connectorId: string, domain: string, recordCount: number, success: boolean, error?: string): void {
  try {
    import("@/core/sentinel/telemetry/sentinel-telemetry-engine").then(({ sentinelTelemetryEngine }) => {
      sentinelTelemetryEngine.emit(
        success ? "gateway:sync_success" : "gateway:sync_failure",
        `gateway:${connectorId}`,
        {
          connectorId,
          domain,
          recordCount,
          success,
          ...(error ? { error } : {}),
          timestamp: Date.now(),
        }
      );

      if (success) {
        sentinelTelemetryEngine.increment("gateway_sync_success_total");
      } else {
        sentinelTelemetryEngine.increment("gateway_sync_failure_total");
      }
    }).catch(() => {});
  } catch {
    // Sentinel integration is non-blocking
  }
}

function bufferForCorrelation(connectorId: string, domain: DataDomain): void {
  const now = Date.now();
  const existing = correlationBuffer.get(domain) ?? [];
  existing.push({
    connectorId,
    domain,
    timestamp: now,
    data: {},
    rawSize: 0,
    normalizedAt: now,
  });

  const filtered = existing.filter((dp) => now - dp.timestamp < BUFFER_WINDOW_MS);
  correlationBuffer.set(domain, filtered);
}

function runCrossSourceCorrelation(): void {
  const now = Date.now();
  const domains = Array.from(correlationBuffer.keys());

  const recentDomains = domains.filter((domain) => {
    const items = correlationBuffer.get(domain) ?? [];
    return items.some((dp) => now - dp.timestamp < BUFFER_WINDOW_MS);
  });

  if (recentDomains.includes("real_estate") && recentDomains.includes("forex")) {
    emitCorrelationSignal({
      id: `corr-re-fx-${now}`,
      type: "opportunity",
      title: "Real Estate + Forex Activity Detected",
      description: "Concurrent DLD transaction and forex rate updates may indicate cross-border investment activity",
      sources: ["dld_transactions", "frankfurter_forex"],
      confidence: 0.6,
      timestamp: now,
      data: { correlatedDomains: ["real_estate", "forex"] },
    });
  }

  if (recentDomains.includes("food_delivery") && recentDomains.includes("weather")) {
    emitCorrelationSignal({
      id: `corr-fd-wx-${now}`,
      type: "trend",
      title: "Weather Impact on Delivery Demand",
      description: "Weather changes detected alongside delivery data updates — demand correlation possible",
      sources: ["openmeteo_weather", "deliveroo_partner", "talabat_partner"],
      confidence: 0.5,
      timestamp: now,
      data: { correlatedDomains: ["food_delivery", "weather"] },
    });
  }

  for (const domain of domains) {
    const items = correlationBuffer.get(domain) ?? [];
    const recentCount = items.filter((dp) => now - dp.timestamp < 60_000).length;
    if (recentCount > 5) {
      emitCorrelationSignal({
        id: `corr-spike-${domain}-${now}`,
        type: "anomaly",
        title: `Data Spike: ${domain}`,
        description: `Unusual volume of data updates in ${domain} domain (${recentCount} in last minute)`,
        sources: [...new Set(items.map((dp) => dp.connectorId))],
        confidence: 0.7,
        timestamp: now,
        data: { domain, recentCount },
      });
    }
  }
}

function emitCorrelationSignal(signal: CorrelationSignal): void {
  recentSignals.push(signal);
  if (recentSignals.length > MAX_SIGNALS) {
    recentSignals.splice(0, recentSignals.length - MAX_SIGNALS);
  }

  platformBus.emit(
    "system:intelligence_correlation",
    signal,
    "system"
  );

  ingestCorrelationIntoOmega(signal);
}

function ingestCorrelationIntoOmega(signal: CorrelationSignal): void {
  try {
    import("@/core/omega/omega-core").then(({ omegaCore }) => {
      if (omegaCore.getPhase() !== "running") return;

      const kg = omegaCore.engines.knowledgeGraph;
      kg.addNode("OPPORTUNITY_SIGNAL", signal.title, "platform_core", {
        correlationType: signal.type,
        confidence: signal.confidence,
        sources: signal.sources,
        detectedAt: signal.timestamp,
      });
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}

export function getRecentCorrelations(): CorrelationSignal[] {
  return [...recentSignals];
}

export function getIntelligenceSummary() {
  const pulse = calculatePulse();
  const metrics = getAllMetrics();
  const connectors = listConnectors();

  return {
    pulse,
    totalSources: connectors.length,
    activeSources: connectors.filter((c) => c.health.status === "connected").length,
    degradedSources: connectors.filter((c) => c.health.status === "degraded").length,
    offlineSources: connectors.filter((c) => c.health.status === "offline").length,
    recentCorrelations: getRecentCorrelations().slice(-10),
    metricsSnapshot: Object.fromEntries(metrics),
    lastUpdated: Date.now(),
  };
}
