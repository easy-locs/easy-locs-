import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const officialWebConnector: OnboardingConnector = {
  source: "official_web",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    const website = input.website ?? null;
    if (!website) return [];
    return [{
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
      metadata: { fetchedFrom: "official_web" },
      sourceUrl: website,
    }];
  },
};
