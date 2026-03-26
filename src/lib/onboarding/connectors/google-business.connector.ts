import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const googleBusinessConnector: OnboardingConnector = {
  source: "google_business",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    const label = [input.name, input.district, input.city, input.country].filter(Boolean).join(" ");
    if (!label) return [];
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
      metadata: { fetchedFrom: "google_business" },
      sourceUrl: null,
    }];
  },
};
