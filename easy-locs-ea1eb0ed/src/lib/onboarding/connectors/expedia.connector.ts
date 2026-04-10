import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const expediaConnector: OnboardingConnector = {
  source: "expedia",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (input.vertical !== "hotel") return [];
    return [{
      source: "expedia",
      sourceEntityId: `${input.name ?? "unknown"}:expedia`,
      vertical: "hotel",
      name: input.name ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      country: input.country ?? null,
      hotelInventory: [],
      photos: [],
      categories: ["hotel"],
      subcategories: [],
      metadata: { fetchedFrom: "expedia" },
    }];
  },
};
