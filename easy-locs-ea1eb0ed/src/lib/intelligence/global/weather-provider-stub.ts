import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import type { IntelligenceProvider } from "./provider-adapter";

function generateWeatherItems(country: string, city?: string): CanonicalGlobalFeedItem[] {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const locationLabel = city ? `${city}, ${country}` : country;

  return [
    {
      id: `weather_current_${country}_${city ?? "national"}_${Date.now()}`,
      sourceId: "weather_stub_v1",
      sourceName: "Weather Service (Stub)",
      sourceTrust: 0.9,
      sourceTier: "tier_2",
      category: "weather",
      subcategory: "current",
      title: `Weather in ${locationLabel}`,
      summary: `Current conditions in ${locationLabel}: Partly cloudy, 28°C. Humidity 45%.`,
      body: null,
      language: "en",
      originalLanguage: "en",
      country,
      region: null,
      city: city ?? null,
      priority: "P3",
      relevanceScore: 0.7,
      freshnessScore: 0.95,
      personalRelevance: 0.6,
      publishedAt: now,
      fetchedAt: now,
      expiresAt,
      tags: ["weather", "current"],
      mediaUrl: null,
      deepLinkUrl: null,
      contentHash: `weather_current_${country}_${city ?? "national"}_${Math.floor(Date.now() / 3_600_000)}`,
    },
    {
      id: `weather_forecast_${country}_${city ?? "national"}_${Date.now()}`,
      sourceId: "weather_stub_v1",
      sourceName: "Weather Service (Stub)",
      sourceTrust: 0.9,
      sourceTier: "tier_2",
      category: "weather",
      subcategory: "forecast",
      title: `Forecast for ${locationLabel}`,
      summary: `Tomorrow: Sunny, high of 32°C, low of 22°C. Light winds from the west.`,
      body: null,
      language: "en",
      originalLanguage: "en",
      country,
      region: null,
      city: city ?? null,
      priority: "P4",
      relevanceScore: 0.5,
      freshnessScore: 0.85,
      personalRelevance: 0.4,
      publishedAt: now,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
      tags: ["weather", "forecast"],
      mediaUrl: null,
      deepLinkUrl: null,
      contentHash: `weather_forecast_${country}_${city ?? "national"}_${Math.floor(Date.now() / 3_600_000)}`,
    },
  ];
}

export const weatherProviderStub: IntelligenceProvider = {
  meta: {
    id: "weather_stub_v1",
    name: "Weather Service (Stub)",
    tier: "tier_2",
    categories: ["weather"],
    countries: ["*"],
    refreshIntervalMs: 1_800_000,
  },
  fetch(country: string, city?: string): CanonicalGlobalFeedItem[] {
    return generateWeatherItems(country, city);
  },
  health() {
    return {
      healthy: true,
      latencyMs: 0,
      lastCheckAt: new Date().toISOString(),
      consecutiveFailures: 0,
    };
  },
};
