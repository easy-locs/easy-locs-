/**
 * Official Web Connector — Stub for scraping merchant's own website.
 * Uses Firecrawl as fallback enrichment source.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const officialWebConnector: SourceConnector = {
  sourceId: "official_web",
  supportedVerticals: ["food", "grocery", "hotel", "services", "property"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    console.log(`[official-web-connector] fetchByUrl: ${url}`);
    // Would invoke firecrawl-scrape edge function
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[official-web-connector] search: "${query}" in ${city}`);
    return [];
  },
};
