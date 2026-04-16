import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, DataDomain, NormalizedDataPoint } from "../types";

export function createConnectorConfig(overrides: {
  id: string;
  name: string;
  description: string;
  domain: DataDomain;
  baseUrl: string;
  pollingIntervalMs?: number;
  healthCheckUrl?: string;
  readOnlyEndpoints?: string[];
  tags?: string[];
} & Partial<ConnectorConfig>): ConnectorConfig {
  return {
    type: "rest",
    authMethod: "none",
    pollingIntervalMs: 3_600_000,
    readOnlyEndpoints: [],
    enabled: true,
    tags: [],
    timeoutMs: 10_000,
    retryCount: 2,
    ...overrides,
  };
}

export class GenericRestConnector extends BaseConnector {
  private parser: (response: Response) => Promise<Record<string, unknown>[]>;

  constructor(
    config: ConnectorConfig,
    parser?: (response: Response) => Promise<Record<string, unknown>[]>
  ) {
    super(config);
    this.parser = parser ?? GenericRestConnector.defaultParser;
  }

  private static async defaultParser(response: Response): Promise<Record<string, unknown>[]> {
    const text = await response.text();
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
    if (json?.data && Array.isArray(json.data)) return json.data;
    if (json?.results && Array.isArray(json.results)) return json.results;
    return [json];
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const endpoint = this.config.readOnlyEndpoints[0] ?? "";
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
    });

    if (!response.ok) throw new Error(`${this.config.name} returned ${response.status}`);

    const cloned = response.clone();
    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;
    const items = await this.parser(cloned);
    const now = Date.now();

    return items.map((item) => ({
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: { source: this.config.id, ...item },
      rawSize: Math.round(rawSize / Math.max(items.length, 1)),
      normalizedAt: now,
    }));
  }

  protected async doHealthCheck(): Promise<boolean> {
    const url = this.config.healthCheckUrl ?? this.config.baseUrl;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  }
}
