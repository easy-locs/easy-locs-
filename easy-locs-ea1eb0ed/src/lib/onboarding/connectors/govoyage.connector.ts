import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const govoyageConnector: OnboardingConnector = {
  source: "govoyage",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (input.vertical !== "hotel") return [];
    return [{
      source: "govoyage",
      sourceEntityId: `${input.name ?? "unknown"}:govoyage`,
      vertical: "hotel",
      name: input.name ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      country: input.country ?? null,
      hotelInventory: [],
      photos: [],
      categories: ["hotel"],
      subcategories: [],
      metadata: { fetchedFrom: "govoyage" },
    }];
  },
};
