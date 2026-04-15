import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const govoyageConnector: OnboardingConnector = {
  source: "govoyage",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (input.vertical !== "hotel") return [];
    return scrapeFromPlatform("govoyage", "govoyages.com", input, ["hotel"]);
  },
};
