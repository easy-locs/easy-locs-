import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import { fetchNews } from "./news-provider";

const GNEWS_API_BASE = "https://gnews.io/api/v4";
const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY as string | undefined;

const NEWSDATA_BASE = "https://newsdata.io/api/1/news";
const NEWSDATA_KEY = import.meta.env.VITE_NEWSDATA_API_KEY as string | undefined;

const COUNTRY_LANG: Record<string, string> = {
  AE: "en", FR: "fr", US: "en", GB: "en", SA: "ar", EG: "ar",
  MA: "fr", DE: "de", IN: "en", BR: "pt", NG: "en", JP: "ja",
};

function msLog(step: string, data?: Record<string, unknown>): void {
  console.log(`[news-multi-source] ${step}`, data ?? "");
}

async function fetchGNews(country: string): Promise<CanonicalGlobalFeedItem[]> {
  if (!GNEWS_KEY) return [];
  try {
    const lang = COUNTRY_LANG[country] ?? "en";
    const url = `${GNEWS_API_BASE}/top-headlines?lang=${lang}&country=${country.toLowerCase()}&max=10&apikey=${GNEWS_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = await res.json();
    const articles = json?.articles ?? [];
    const now = new Date().toISOString();
    return articles.map((a: any, i: number) => ({
      id: `gnews_${country}_${Date.now()}_${i}`,
      sourceId: "gnews_api",
      sourceName: a.source?.name ?? "GNews",
      sourceTrust: 0.8,
      sourceTier: "tier_2" as const,
      category: "news" as const,
      subcategory: "local",
      title: a.title?.replace(/ - [^-]+$/, "").trim() ?? "",
      summary: a.description ?? a.title ?? "",
      body: a.content ?? null,
      language: lang,
      originalLanguage: lang,
      country,
      region: null,
      city: null,
      priority: "P3" as const,
      relevanceScore: 0.75 - i * 0.02,
      freshnessScore: 0.9,
      personalRelevance: 0.5,
      publishedAt: a.publishedAt ?? now,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      tags: ["news", "local", country.toLowerCase()],
      mediaUrl: a.image ?? null,
      deepLinkUrl: a.url ?? null,
      contentHash: `gnews_${a.title?.slice(0, 30)}`,
    }));
  } catch (err) {
    msLog("gnews_fetch_error", { error: err instanceof Error ? err.message : "unknown" });
    return [];
  }
}

async function fetchNewsData(country: string): Promise<CanonicalGlobalFeedItem[]> {
  if (!NEWSDATA_KEY) return [];
  try {
    const lang = COUNTRY_LANG[country] ?? "en";
    const url = `${NEWSDATA_BASE}?apikey=${NEWSDATA_KEY}&country=${country.toLowerCase()}&language=${lang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = await res.json();
    const results = json?.results ?? [];
    const now = new Date().toISOString();
    return results.slice(0, 10).map((a: any, i: number) => ({
      id: `newsdata_${country}_${Date.now()}_${i}`,
      sourceId: "newsdata_api",
      sourceName: a.source_id ?? "NewsData",
      sourceTrust: 0.7,
      sourceTier: "tier_2" as const,
      category: "news" as const,
      subcategory: "local",
      title: a.title?.replace(/ - [^-]+$/, "").trim() ?? "",
      summary: a.description ?? a.title ?? "",
      body: a.content ?? null,
      language: lang,
      originalLanguage: lang,
      country,
      region: null,
      city: null,
      priority: "P3" as const,
      relevanceScore: 0.65 - i * 0.02,
      freshnessScore: 0.8,
      personalRelevance: 0.5,
      publishedAt: a.pubDate ?? now,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      tags: ["news", "local", country.toLowerCase()],
      mediaUrl: a.image_url ?? null,
      deepLinkUrl: a.link ?? null,
      contentHash: `newsdata_${a.title?.slice(0, 30)}`,
    }));
  } catch (err) {
    msLog("newsdata_fetch_error", { error: err instanceof Error ? err.message : "unknown" });
    return [];
  }
}

function deduplicateByTitle(items: CanonicalGlobalFeedItem[]): CanonicalGlobalFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export async function fetchMultiSourceNews(
  country: string,
  city?: string,
): Promise<CanonicalGlobalFeedItem[]> {
  const results = await Promise.allSettled([
    fetchNews(country, city),
    fetchGNews(country),
    fetchNewsData(country),
  ]);

  const allItems: CanonicalGlobalFeedItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      allItems.push(...result.value);
    }
  }

  const sourceCount = results.filter(
    (r) => r.status === "fulfilled" && (r.value?.length ?? 0) > 0,
  ).length;

  msLog("aggregated", {
    totalItems: allItems.length,
    sourcesSucceeded: sourceCount,
    country,
  });

  const deduplicated = deduplicateByTitle(allItems);

  deduplicated.sort((a, b) => {
    const scoreA = a.relevanceScore + a.freshnessScore;
    const scoreB = b.relevanceScore + b.freshnessScore;
    return scoreB - scoreA;
  });

  return deduplicated.slice(0, 25);
}

export function isMultiSourceAvailable(): boolean {
  return !!(GNEWS_KEY || NEWSDATA_KEY);
}
