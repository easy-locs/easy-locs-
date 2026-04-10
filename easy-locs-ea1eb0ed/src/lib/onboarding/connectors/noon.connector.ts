import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const noonConnector: OnboardingConnector = {
  source: "noon",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    return [{
      source: "noon",
      sourceEntityId: `${input.name ?? "unknown"}:noon`,
      vertical: input.vertical,
      name: input.name ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      country: input.country ?? null,
      categories: ["grocery"],
      subcategories: [],
      menuItems: [],
      photos: [],
      metadata: { fetchedFrom: "noon" },
    }];
  },
};
