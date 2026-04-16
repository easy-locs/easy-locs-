import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";

const PRAYER_CONFIG: ConnectorConfig = {
  id: "aladhan_prayer_times",
  name: "Al-Adhan Prayer Times",
  description: "Prayer times from the Al-Adhan API based on geo-location",
  type: "rest",
  domain: "prayer",
  pollingIntervalMs: 86_400_000,
  authMethod: "none",
  baseUrl: "https://api.aladhan.com/v1",
  healthCheckUrl: "https://api.aladhan.com/v1/timingsByCity?city=Dubai&country=UAE&method=2",
  readOnlyEndpoints: ["/timingsByCity", "/timingsByAddress", "/calendar"],
  enabled: true,
  tags: ["prayer", "islamic", "free", "global"],
  quotaLimit: 0,
  quotaWindowMs: 0,
  timeoutMs: 8_000,
  retryCount: 2,
};

export class PrayerTimesConnector extends BaseConnector {
  constructor() {
    super(PRAYER_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const response = await fetch(
      `${this.config.baseUrl}/timingsByCity?city=Dubai&country=UAE&method=2`,
      { signal: AbortSignal.timeout(this.config.timeoutMs ?? 8_000) }
    );

    if (!response.ok) throw new Error(`Al-Adhan returned ${response.status}`);

    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;
    const data = JSON.parse(rawText);
    const now = Date.now();

    return [{
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: {
        source: "aladhan",
        timings: data?.data?.timings ?? {},
        date: data?.data?.date ?? {},
        meta: data?.data?.meta ?? {},
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

export const prayerTimesConnector = new PrayerTimesConnector();
