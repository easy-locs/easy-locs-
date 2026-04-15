import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeByPlatformSearch, validatePhotoUrls } from "../scraping";
import { geocodeAddress } from "../scraping/nominatim";

export const googleBusinessConnector: OnboardingConnector = {
  source: "google_business",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    const label = [input.name, input.district, input.city, input.country].filter(Boolean).join(" ");
    if (!label) return [];

    try {
      const scraped = await scrapeByPlatformSearch({
        source: "google_business",
        platformDomain: undefined,
        name: input.name,
        city: input.city,
        country: input.country,
      });

      let lat: number | null = scraped?.lat ?? null;
      let lng: number | null = scraped?.lng ?? null;

      if (lat == null || lng == null) {
        const geo = await geocodeAddress({
          name: input.name,
          address: scraped?.address,
          city: input.city,
          country: input.country,
        });
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      if (!scraped) {
        return [{
          source: "google_business",
          sourceEntityId: label,
          vertical: input.vertical,
          name: input.name ?? null,
          address: null,
          city: input.city ?? null,
          district: input.district ?? null,
          country: input.country ?? null,
          lat,
          lng,
          phone: input.phone ?? null,
          website: input.website ?? null,
          categories: [],
          subcategories: [],
          photos: [],
          rating: null,
          reviewCount: null,
          metadata: { fetchedFrom: "google_business", scraped: false },
          sourceUrl: null,
        }];
      }

      return [{
        source: "google_business",
        sourceEntityId: scraped.sourceUrl || label,
        vertical: input.vertical,
        name: scraped.name || input.name || null,
        address: scraped.address || null,
        city: input.city ?? null,
        district: input.district ?? null,
        country: input.country ?? null,
        lat,
        lng,
        phone: scraped.phone || input.phone || null,
        email: scraped.email || null,
        website: scraped.website || input.website || null,
        categories: scraped.categories,
        subcategories: scraped.subcategories,
        openingHours: scraped.openingHours ? { raw: scraped.openingHours } : null,
        photos: scraped.photos.length > 0 ? await validatePhotoUrls(scraped.photos) : [],
        rating: null,
        reviewCount: null,
        metadata: {
          fetchedFrom: "google_business",
          confidence: scraped.confidence,
          provenance: scraped.provenance,
          description: scraped.description,
          socialLinks: scraped.socialLinks,
          scrapedAt: new Date().toISOString(),
        },
        sourceUrl: scraped.sourceUrl,
      }];
    } catch (err) {
      console.warn("[google-business] scrape failed:", err);
      return [{
        source: "google_business",
        sourceEntityId: label,
        vertical: input.vertical,
        name: input.name ?? null,
        address: null,
        city: input.city ?? null,
        district: input.district ?? null,
        country: input.country ?? null,
        lat: null,
        lng: null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        categories: [],
        subcategories: [],
        photos: [],
        rating: null,
        reviewCount: null,
        metadata: { fetchedFrom: "google_business", scraped: false },
        sourceUrl: null,
      }];
    }
  },
};
