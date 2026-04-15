import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const noonConnector: OnboardingConnector = {
  source: "noon",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (!["food", "grocery"].includes(input.vertical)) return [];
    return scrapeFromPlatform("noon", "noon.com", input, ["grocery"]);
  },
};
