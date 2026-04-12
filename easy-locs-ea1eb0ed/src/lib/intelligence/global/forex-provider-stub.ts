import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import type { IntelligenceProvider } from "./provider-adapter";

const FOREX_PAIRS: Record<string, { base: string; pairs: { symbol: string; rate: number; change: number }[] }> = {
  AE: { base: "AED", pairs: [{ symbol: "USD/AED", rate: 3.6725, change: 0.01 }, { symbol: "EUR/AED", rate: 4.02, change: -0.15 }, { symbol: "GBP/AED", rate: 4.65, change: 0.08 }] },
  FR: { base: "EUR", pairs: [{ symbol: "EUR/USD", rate: 1.0950, change: 0.12 }, { symbol: "EUR/GBP", rate: 0.8650, change: -0.05 }, { symbol: "EUR/CHF", rate: 0.9720, change: 0.03 }] },
  US: { base: "USD", pairs: [{ symbol: "EUR/USD", rate: 1.0950, change: 0.12 }, { symbol: "GBP/USD", rate: 1.2680, change: 0.08 }, { symbol: "USD/JPY", rate: 149.50, change: -0.32 }] },
  GB: { base: "GBP", pairs: [{ symbol: "GBP/USD", rate: 1.2680, change: 0.08 }, { symbol: "GBP/EUR", rate: 1.1560, change: 0.05 }, { symbol: "GBP/JPY", rate: 189.60, change: -0.22 }] },
  SA: { base: "SAR", pairs: [{ symbol: "USD/SAR", rate: 3.7500, change: 0.00 }, { symbol: "EUR/SAR", rate: 4.1063, change: -0.14 }, { symbol: "GBP/SAR", rate: 4.7550, change: 0.07 }] },
  EG: { base: "EGP", pairs: [{ symbol: "USD/EGP", rate: 49.50, change: -0.20 }, { symbol: "EUR/EGP", rate: 54.20, change: -0.35 }, { symbol: "SAR/EGP", rate: 13.20, change: -0.05 }] },
  MA: { base: "MAD", pairs: [{ symbol: "USD/MAD", rate: 9.95, change: 0.03 }, { symbol: "EUR/MAD", rate: 10.90, change: -0.08 }, { symbol: "GBP/MAD", rate: 12.62, change: 0.05 }] },
  IN: { base: "INR", pairs: [{ symbol: "USD/INR", rate: 83.40, change: -0.15 }, { symbol: "EUR/INR", rate: 91.32, change: -0.28 }, { symbol: "GBP/INR", rate: 105.75, change: 0.10 }] },
};

const DEFAULT_PAIRS = { base: "USD", pairs: [{ symbol: "EUR/USD", rate: 1.0950, change: 0.12 }, { symbol: "GBP/USD", rate: 1.2680, change: 0.08 }] };

function generateForexItems(country: string): CanonicalGlobalFeedItem[] {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1_800_000).toISOString();
  const data = FOREX_PAIRS[country] ?? DEFAULT_PAIRS;
  const summaryParts = data.pairs.map(p => `${p.symbol}: ${p.rate.toFixed(4)} (${p.change >= 0 ? "+" : ""}${p.change.toFixed(2)}%)`);

  return [
    {
      id: `forex_${country}_${Date.now()}`,
      sourceId: "forex_stub_v1",
      sourceName: "Forex Data (Stub)",
      sourceTrust: 0.85,
      sourceTier: "tier_2",
      category: "forex",
      subcategory: "rates",
      title: `${data.base} Exchange Rates`,
      summary: summaryParts.join(" | "),
      body: null,
      language: "en",
      originalLanguage: "en",
      country,
      region: null,
      city: null,
      priority: "P3",
      relevanceScore: 0.65,
      freshnessScore: 0.9,
      personalRelevance: 0.5,
      publishedAt: now,
      fetchedAt: now,
      expiresAt,
      tags: ["forex", "finance", data.base.toLowerCase()],
      mediaUrl: null,
      deepLinkUrl: null,
      contentHash: `forex_${country}_${Math.floor(Date.now() / 1_800_000)}`,
    },
  ];
}

export const forexProviderStub: IntelligenceProvider = {
  meta: {
    id: "forex_stub_v1",
    name: "Forex Data (Stub)",
    tier: "tier_2",
    categories: ["forex", "finance"],
    countries: ["*"],
    refreshIntervalMs: 900_000,
  },
  fetch(country: string): CanonicalGlobalFeedItem[] {
    return generateForexItems(country);
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
