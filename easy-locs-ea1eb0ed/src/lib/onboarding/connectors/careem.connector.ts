import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const careemConnector: OnboardingConnector = {
  source: "careem",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    const categories = input.vertical === "food" ? ["restaurant"] : ["grocery"];
    return scrapeFromPlatform("careem", "careem.com", input, categories);
  },
};
