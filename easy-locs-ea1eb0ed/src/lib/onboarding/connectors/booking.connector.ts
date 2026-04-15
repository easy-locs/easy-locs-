import type { OnboardingConnector, ConnectorQuery } from "./base.connector";
import type { SourceEntityRecord } from "../types";
import { scrapeFromPlatform } from "./platform-scraper";

export const bookingConnector: OnboardingConnector = {
  source: "booking",
  async search(input: ConnectorQuery): Promise<SourceEntityRecord[]> {
    if (input.vertical !== "hotel") return [];
    return scrapeFromPlatform("booking", "booking.com", input, ["hotel"]);
  },
};
