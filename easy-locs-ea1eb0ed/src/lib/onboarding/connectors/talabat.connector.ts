import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const talabatConnector: OnboardingConnector = {
  source: "talabat",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    const categories = input.vertical === "food" ? ["restaurant"] : ["grocery"];
    return scrapeFromPlatform("talabat", "talabat.com", input, categories);
  },
};
