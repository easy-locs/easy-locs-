import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const deliverooConnector: OnboardingConnector = {
  source: "deliveroo",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    const categories = input.vertical === "food" ? ["restaurant"] : ["grocery"];
    return scrapeFromPlatform("deliveroo", "deliveroo.com", input, categories);
  },
};
