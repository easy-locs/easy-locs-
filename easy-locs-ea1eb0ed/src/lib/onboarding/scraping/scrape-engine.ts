import type { SourceName } from "../types";
import { firecrawlSearch, firecrawlScrape } from "./firecrawl-client";
import { extractAllFromMarkdown, type ScrapedData } from "./extractors";
import { geocodeAddress } from "./nominatim";

export interface PlatformScrapeOptions {
  source: SourceName;
  platformDomain?: string;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
}

function needsGeoFallback(data: ScrapedData): boolean {
  return data.lat == null || data.lng == null;
}

async function enrichWithNominatim(data: ScrapedData, fallbackName?: string | null, city?: string | null, country?: string | null): Promise<void> {
  if (!needsGeoFallback(data)) return;
  const geo = await geocodeAddress({
    name: data.name || fallbackName || null,
    address: data.address,
    city: city || null,
    country: country || null,
  });
  if (geo) {
    data.lat = geo.lat;
    data.lng = geo.lng;
    data.provenance.coordinates = { source: "nominatim", confidence: geo.confidence };
  }
}

export async function scrapeByUrl(url: string, source: SourceName): Promise<ScrapedData | null> {
  const result = await firecrawlScrape(url, { onlyMainContent: false, waitFor: 2000 });
  if (!result || !result.markdown || result.markdown.length < 50) return null;

  const data = extractAllFromMarkdown(result.markdown, result.metadata, source, url);
  if (needsGeoFallback(data) && (data.name || data.address)) {
    await enrichWithNominatim(data);
  }

  return data;
}

export async function scrapeByPlatformSearch(options: PlatformScrapeOptions): Promise<ScrapedData | null> {
  const { source, platformDomain, name, city, country } = options;

  if (!name && !options.website) return null;

  if (options.website) {
    return scrapeByUrl(options.website, source);
  }

  const searchParts = [name, city, country].filter(Boolean);
  const query = platformDomain
    ? `${searchParts.join(" ")} site:${platformDomain}`
    : searchParts.join(" ");

  const results = await firecrawlSearch(query, {
    limit: 2,
    country: country?.toLowerCase(),
  });

  if (results.length === 0) return null;

  const topResult = results[0];

  if (topResult.markdown && topResult.markdown.length > 100) {
    const data = extractAllFromMarkdown(
      topResult.markdown,
      { title: topResult.title, description: topResult.description },
      source,
      topResult.url,
    );
    if (!data.name && topResult.title) {
      data.name = topResult.title.replace(/ - .*$/, "").replace(/ \| .*$/, "").trim();
    }
    await enrichWithNominatim(data, name, city, country);
    return data;
  }

  const scrapeResult = await firecrawlScrape(topResult.url, { onlyMainContent: false, waitFor: 2000 });
  if (!scrapeResult || !scrapeResult.markdown || scrapeResult.markdown.length < 50) {
    const fallbackData = extractAllFromMarkdown(
      topResult.description || "",
      { title: topResult.title },
      source,
      topResult.url,
    );
    if (!fallbackData.name && topResult.title) {
      fallbackData.name = topResult.title.replace(/ - .*$/, "").replace(/ \| .*$/, "").trim();
    }
    await enrichWithNominatim(fallbackData, name, city, country);
    return fallbackData;
  }

  const data = extractAllFromMarkdown(scrapeResult.markdown, scrapeResult.metadata, source, topResult.url);
  if (!data.name && topResult.title) {
    data.name = topResult.title.replace(/ - .*$/, "").replace(/ \| .*$/, "").trim();
  }
  await enrichWithNominatim(data, name, city, country);

  return data;
}

export function scrapedDataToPartialRecord(scraped: ScrapedData): Record<string, unknown> {
  return {
    name: scraped.name,
    address: scraped.address,
    phone: scraped.phone,
    email: scraped.email,
    website: scraped.website,
    lat: scraped.lat,
    lng: scraped.lng,
    photos: scraped.photos,
    menuItems: scraped.menuItems,
    categories: scraped.categories,
    subcategories: scraped.subcategories,
    socialLinks: scraped.socialLinks,
    openingHours: scraped.openingHours ? { raw: scraped.openingHours } : null,
    sourceUrl: scraped.sourceUrl,
    metadata: {
      confidence: scraped.confidence,
      provenance: scraped.provenance,
      description: scraped.description,
    },
  };
}
