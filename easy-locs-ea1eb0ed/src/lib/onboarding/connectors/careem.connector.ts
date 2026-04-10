import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";

export const careemConnector: OnboardingConnector = {
  source: "careem",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    return [{
      source: "careem",
      sourceEntityId: `${input.name ?? "unknown"}:careem`,
      vertical: input.vertical,
      name: input.name ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      country: input.country ?? null,
      categories: input.vertical === "food" ? ["restaurant"] : ["grocery"],
      subcategories: [],
      menuItems: [],
      photos: [],
      metadata: { fetchedFrom: "careem" },
    }];
  },
};
