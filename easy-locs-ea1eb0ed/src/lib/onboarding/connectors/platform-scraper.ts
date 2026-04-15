import type { ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord, SourceName } from "../types";
import { scrapeByPlatformSearch, validatePhotoUrls, type ScrapedData } from "../scraping";

export async function scrapeFromPlatform(
  source: SourceName,
  platformDomain: string | undefined,
  input: ConnectorQuery,
  defaultCategories: string[],
): Promise<SourceEntityRecord[]> {
  try {
    const scraped = await scrapeByPlatformSearch({
      source,
      platformDomain,
      name: input.name,
      city: input.city,
      country: input.country,
      website: input.website,
    });

    if (!scraped) {
      return [buildFallbackRecord(source, input, defaultCategories)];
    }

    if (scraped.photos.length > 0) {
      scraped.photos = await validatePhotoUrls(scraped.photos);
    }

    return [buildRecordFromScraped(source, input, scraped, defaultCategories)];
  } catch (err) {
    console.warn(`[${source}] scrape failed:`, err);
    return [buildFallbackRecord(source, input, defaultCategories)];
  }
}

function buildRecordFromScraped(
  source: SourceName,
  input: ConnectorQuery,
  scraped: ScrapedData,
  defaultCategories: string[],
): SourceEntityRecord {
  return {
    source,
    sourceEntityId: scraped.sourceUrl || `${input.name ?? "unknown"}:${source}`,
    vertical: input.vertical,
    name: scraped.name || input.name || null,
    address: scraped.address || null,
    city: input.city || null,
    district: input.district || null,
    country: input.country || null,
    lat: scraped.lat,
    lng: scraped.lng,
    phone: scraped.phone || input.phone || null,
    email: scraped.email || null,
    website: scraped.website || input.website || null,
    categories: scraped.categories.length > 0 ? scraped.categories : defaultCategories,
    subcategories: scraped.subcategories,
    openingHours: scraped.openingHours ? { raw: scraped.openingHours } : null,
    menuItems: scraped.menuItems.map((item, idx) => ({
      id: `${source}_item_${idx}`,
      ...item,
    })),
    photos: scraped.photos,
    metadata: {
      fetchedFrom: source,
      confidence: scraped.confidence,
      provenance: scraped.provenance,
      description: scraped.description,
      socialLinks: scraped.socialLinks,
      scrapedAt: new Date().toISOString(),
    },
    sourceUrl: scraped.sourceUrl,
  };
}

function buildFallbackRecord(
  source: SourceName,
  input: ConnectorQuery,
  defaultCategories: string[],
): SourceEntityRecord {
  return {
    source,
    sourceEntityId: `${input.name ?? "unknown"}:${source}`,
    vertical: input.vertical,
    name: input.name ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    country: input.country ?? null,
    categories: defaultCategories,
    subcategories: [],
    menuItems: [],
    photos: [],
    metadata: { fetchedFrom: source, scraped: false },
  };
}
