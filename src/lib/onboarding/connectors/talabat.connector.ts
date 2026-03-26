import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const talabatConnector: OnboardingConnector = {
  source: "talabat",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    return [{
      source: "talabat",
      sourceEntityId: `${input.name ?? "unknown"}:talabat`,
      vertical: input.vertical,
      name: input.name ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      country: input.country ?? null,
      categories: input.vertical === "food" ? ["restaurant"] : ["grocery"],
      subcategories: [],
      menuItems: [],
      photos: [],
      metadata: { fetchedFrom: "talabat" },
    }];
  },
};
