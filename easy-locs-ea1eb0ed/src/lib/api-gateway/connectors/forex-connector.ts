import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";

const FOREX_CONFIG: ConnectorConfig = {
  id: "frankfurter_forex",
  name: "Frankfurter (ECB)",
  description: "Foreign exchange rates from the European Central Bank via Frankfurter API",
  type: "rest",
  domain: "forex",
  pollingIntervalMs: 300_000,
  authMethod: "none",
  baseUrl: "https://api.frankfurter.app",
  healthCheckUrl: "https://api.frankfurter.app/latest?from=USD&to=AED",
  readOnlyEndpoints: ["/latest", "/currencies", "/{date}"],
  enabled: true,
  tags: ["forex", "ecb", "free", "global"],
  quotaLimit: 0,
  quotaWindowMs: 0,
  timeoutMs: 5_000,
  retryCount: 2,
};

export class ForexConnector extends BaseConnector {
  constructor() {
    super(FOREX_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const pairs = ["AED", "EUR", "GBP", "SAR", "EGP"];
    const response = await fetch(
      `${this.config.baseUrl}/latest?from=USD&to=${pairs.join(",")}`,
      { signal: AbortSignal.timeout(this.config.timeoutMs ?? 5_000) }
    );

    if (!response.ok) throw new Error(`Frankfurter returned ${response.status}`);

    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;
    const data = JSON.parse(rawText);
    const now = Date.now();

    return [{
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: {
        source: "frankfurter_ecb",
        base: data.base,
        date: data.date,
        rates: data.rates,
      },
      rawSize,
      normalizedAt: now,
    }];
  }

  protected async doHealthCheck(): Promise<boolean> {
    const response = await fetch(
      this.config.healthCheckUrl!,
      { signal: AbortSignal.timeout(5_000) }
    );
    return response.ok;
  }
}

export const forexConnector = new ForexConnector();
