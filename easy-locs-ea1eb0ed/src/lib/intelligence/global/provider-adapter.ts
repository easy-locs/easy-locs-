import type { CanonicalGlobalFeedItem, GlobalFeedCategory, GlobalFeedSourceTier } from "@/domains/shared/canonical-types";

export interface ProviderHealth {
  healthy: boolean;
  latencyMs: number;
  lastCheckAt: string;
  consecutiveFailures: number;
}

export interface ProviderMeta {
  id: string;
  name: string;
  tier: GlobalFeedSourceTier;
  categories: GlobalFeedCategory[];
  countries: string[];
  refreshIntervalMs: number;
}

export interface IntelligenceProvider {
  meta: ProviderMeta;
  fetch(country: string, city?: string): CanonicalGlobalFeedItem[];
  health(): ProviderHealth;
}

const providerRegistry = new Map<string, IntelligenceProvider>();

export function registerProvider(provider: IntelligenceProvider): void {
  providerRegistry.set(provider.meta.id, provider);
}

export function getProvider(id: string): IntelligenceProvider | undefined {
  return providerRegistry.get(id);
}

export function listProviders(): IntelligenceProvider[] {
  return Array.from(providerRegistry.values());
}

export function listProvidersByCategory(category: GlobalFeedCategory): IntelligenceProvider[] {
  return Array.from(providerRegistry.values()).filter(p =>
    p.meta.categories.includes(category)
  );
}

export function listProvidersByCountry(country: string): IntelligenceProvider[] {
  return Array.from(providerRegistry.values()).filter(p =>
    p.meta.countries.includes(country) || p.meta.countries.includes("*")
  );
}

export function fetchFromAllProviders(country: string, city?: string): CanonicalGlobalFeedItem[] {
  const items: CanonicalGlobalFeedItem[] = [];
  for (const provider of providerRegistry.values()) {
    if (!provider.meta.countries.includes(country) && !provider.meta.countries.includes("*")) continue;
    const health = provider.health();
    if (!health.healthy) continue;
    try {
      const fetched = provider.fetch(country, city);
      items.push(...fetched);
    } catch {
      // silently skip failed providers per architecture fail-safe rule
    }
  }
  return items;
}
