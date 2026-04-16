import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";

const DLD_CONFIG: ConnectorConfig = {
  id: "dld_transactions",
  name: "Dubai Land Department",
  description: "Real-time DLD transaction data for Dubai real estate analytics",
  type: "rest",
  domain: "real_estate",
  pollingIntervalMs: 3_600_000,
  authMethod: "none",
  baseUrl: "https://gateway.dubailand.gov.ae/open-data",
  healthCheckUrl: "https://gateway.dubailand.gov.ae/open-data/transactions?limit=1",
  readOnlyEndpoints: [
    "/transactions",
    "/transactions/kpis",
    "/transactions/districts",
    "/transactions/trends",
  ],
  enabled: true,
  tags: ["real-estate", "dubai", "government", "open-data"],
  quotaLimit: 1000,
  quotaWindowMs: 86_400_000,
  timeoutMs: 15_000,
  retryCount: 3,
};

export class DldConnector extends BaseConnector {
  constructor() {
    super(DLD_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const url = `${this.config.baseUrl}/transactions?limit=50&offset=0`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000),
    });

    if (!response.ok) {
      throw new Error(`DLD API returned ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;

    let parsed: Record<string, unknown>[];
    try {
      const json = JSON.parse(rawText);
      parsed = Array.isArray(json) ? json : json?.response ?? json?.data ?? [];
    } catch {
      throw new Error("Failed to parse DLD API response");
    }

    const now = Date.now();
    return parsed.map((item) => ({
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: item,
      rawSize: Math.round(rawSize / Math.max(parsed.length, 1)),
      normalizedAt: now,
    }));
  }

  protected async doHealthCheck(): Promise<boolean> {
    const url = this.config.healthCheckUrl ?? `${this.config.baseUrl}/transactions?limit=1`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  }
}

export const dldConnector = new DldConnector();
