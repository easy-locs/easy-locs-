import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";

const WEATHER_CONFIG: ConnectorConfig = {
  id: "openmeteo_weather",
  name: "Open-Meteo Weather",
  description: "Free weather data from Open-Meteo API for all supported cities",
  type: "rest",
  domain: "weather",
  pollingIntervalMs: 900_000,
  authMethod: "none",
  baseUrl: "https://api.open-meteo.com/v1/forecast",
  healthCheckUrl: "https://api.open-meteo.com/v1/forecast?latitude=25.2&longitude=55.27&current_weather=true",
  readOnlyEndpoints: ["/forecast"],
  enabled: true,
  tags: ["weather", "free", "global"],
  quotaLimit: 10_000,
  quotaWindowMs: 86_400_000,
  timeoutMs: 5_000,
  retryCount: 2,
};

const DEFAULT_COORDS = { lat: 25.2048, lng: 55.2708 };

export class WeatherConnector extends BaseConnector {
  constructor() {
    super(WEATHER_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const url = `${this.config.baseUrl}?latitude=${DEFAULT_COORDS.lat}&longitude=${DEFAULT_COORDS.lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,weathercode`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 5_000),
    });

    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);

    const rawText = await response.text();
    const rawSize = new TextEncoder().encode(rawText).byteLength;
    const data = JSON.parse(rawText);
    const now = Date.now();

    return [{
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: {
        source: "openmeteo",
        current: data.current_weather,
        latitude: data.latitude,
        longitude: data.longitude,
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

export const weatherConnector = new WeatherConnector();
