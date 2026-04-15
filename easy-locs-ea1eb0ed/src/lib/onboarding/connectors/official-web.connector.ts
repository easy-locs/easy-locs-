import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeByUrl, validatePhotoUrls } from "../scraping";
import { geocodeAddress } from "../scraping/nominatim";

export const officialWebConnector: OnboardingConnector = {
  source: "official_web",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    const website = input.website ?? null;
    if (!website) return [];

    try {
      const scraped = await scrapeByUrl(website, "official_web");
      if (!scraped) {
        return [buildFallbackRecord(input, website)];
      }

      if (scraped.lat == null || scraped.lng == null) {
        const geo = await geocodeAddress({
          name: scraped.name || input.name,
          address: scraped.address,
          city: input.city,
          country: input.country,
        });
        if (geo) {
          scraped.lat = geo.lat;
          scraped.lng = geo.lng;
        }
      }

      if (scraped.photos.length > 0) {
        scraped.photos = await validatePhotoUrls(scraped.photos);
      }

      return [{
        source: "official_web",
        sourceEntityId: website,
        vertical: input.vertical,
        name: scraped.name || input.name || null,
        address: scraped.address || null,
        city: input.city || null,
        district: input.district || null,
        country: input.country || null,
        lat: scraped.lat,
        lng: scraped.lng,
        phone: scraped.phone || null,
        email: scraped.email || null,
        website,
        categories: scraped.categories,
        subcategories: scraped.subcategories,
        openingHours: scraped.openingHours ? { raw: scraped.openingHours } : null,
        menuItems: scraped.menuItems.map((item, idx) => ({
          id: `official_web_item_${idx}`,
          ...item,
        })),
        hotelInventory: [],
        serviceItems: [],
        photos: scraped.photos,
        metadata: {
          fetchedFrom: "official_web",
          confidence: scraped.confidence,
          provenance: scraped.provenance,
          description: scraped.description,
          socialLinks: scraped.socialLinks,
          scrapedAt: new Date().toISOString(),
        },
        sourceUrl: website,
      }];
    } catch (err) {
      console.warn("[official-web] scrape failed:", err);
      return [buildFallbackRecord(input, website)];
    }
  },
};

function buildFallbackRecord(input: ConnectorQuery, website: string): SourceEntityRecord {
  return {
    source: "official_web",
    sourceEntityId: website,
    vertical: input.vertical,
    name: input.name ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    country: input.country ?? null,
    website,
    phone: null,
    categories: [],
    subcategories: [],
    openingHours: null,
    menuItems: [],
    hotelInventory: [],
    serviceItems: [],
    photos: [],
    metadata: { fetchedFrom: "official_web", scraped: false },
    sourceUrl: website,
  };
}
