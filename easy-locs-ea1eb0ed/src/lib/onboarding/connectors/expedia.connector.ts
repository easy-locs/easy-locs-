import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const expediaConnector: OnboardingConnector = {
  source: "expedia",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (input.vertical !== "hotel") return [];
    return scrapeFromPlatform("expedia", "expedia.com", input, ["hotel"]);
  },
};
